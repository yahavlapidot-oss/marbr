import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CampaignStatus, CampaignType, EntryMethod } from '@prisma/client';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ScanEntryDto } from './dto/scan.dto';
import { generateCode } from '../common/code.util';

@Injectable()
export class EntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── Staff: generate a time-limited QR for a campaign ───────────────────────
  async generateQr(campaignId: string): Promise<{ qrDataUrl: string; token: string }> {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET', 'qr-secret');
    // 65s expiry aligns with 60s auto-rotation in the business panel
    const token = jwt.sign({ campaignId, ts: Date.now() }, secret, { expiresIn: '65s' });
    const qrDataUrl = await QRCode.toDataURL(token, { width: 300, margin: 2 });
    return { qrDataUrl, token };
  }

  // ─── Customer: submit entry ──────────────────────────────────────────────────
  async createEntry(userId: string, dto: ScanEntryDto) {
    let campaignId = dto.campaignId;

    // Verify JWT-signed QR codes and extract campaignId from the token payload
    if (dto.code) {
      const secret = this.config.get<string>('JWT_ACCESS_SECRET', 'qr-secret');
      try {
        const decoded = jwt.verify(dto.code, secret) as { campaignId?: string };
        if (decoded.campaignId) campaignId = decoded.campaignId;
      } catch {
        throw new BadRequestException('QR code is invalid or expired — ask staff for a new one');
      }
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { rewards: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    this.assertCampaignActive(campaign);
    await this.assertEligible(userId, campaign);

    // One active campaign per user — check if user is enrolled in a different active campaign
    await this.assertNotInAnotherCampaign(userId, campaignId);

    // Store hash for audit trail only — multiple users can scan the same rotating QR
    const codeHash = dto.code
      ? crypto.createHash('sha256').update(dto.code).digest('hex')
      : null;

    const [entry] = await this.prisma.$transaction([
      this.prisma.entry.create({
        data: {
          campaignId,
          userId,
          method: dto.method,
          codeHash,
          purchaseRef: dto.purchaseRef,
          metadata: { lat: dto.lat, lng: dto.lng },
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { currentCampaignId: campaignId },
      }),
    ]);

    const userReward = await this.processWinEngine(userId, campaign, entry.id);
    return { entry, reward: userReward ?? null, campaign: { id: campaign.id, name: campaign.name, type: campaign.type } };
  }

  // ─── Get user's current active campaign ─────────────────────────────────────
  async getActiveCampaign(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentCampaignId: true },
    });
    if (!user?.currentCampaignId) return null;

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: user.currentCampaignId },
      select: {
        id: true, name: true, type: true, status: true, endsAt: true,
        business: { select: { id: true, name: true } },
      },
    });

    // Auto-clear if campaign is no longer active
    if (!campaign || campaign.status === 'ENDED' || campaign.status === 'CANCELLED') {
      await this.prisma.user.update({ where: { id: userId }, data: { currentCampaignId: null } });
      return null;
    }

    return campaign;
  }

  // ─── Leave current campaign ──────────────────────────────────────────────────
  async leaveActiveCampaign(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { currentCampaignId: null },
    });
    return { success: true };
  }

  private assertCampaignActive(campaign: { status: CampaignStatus; startsAt: Date | null; endsAt: Date | null }) {
    const now = new Date();
    if (campaign.status !== CampaignStatus.ACTIVE)
      throw new BadRequestException('Campaign is not active');
    // When status is ACTIVE the business has explicitly started it — skip startsAt check
    if (campaign.endsAt && campaign.endsAt < now)
      throw new BadRequestException('Campaign has ended');
  }

  private async assertNotInAnotherCampaign(userId: string, campaignId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentCampaignId: true },
    });
    if (!user?.currentCampaignId || user.currentCampaignId === campaignId) return;

    // Check if the campaign they're in is still active (auto-clear if ended)
    const activeCampaign = await this.prisma.campaign.findUnique({
      where: { id: user.currentCampaignId },
      select: { name: true, status: true },
    });
    if (!activeCampaign || activeCampaign.status === 'ENDED' || activeCampaign.status === 'CANCELLED') {
      await this.prisma.user.update({ where: { id: userId }, data: { currentCampaignId: null } });
      return;
    }

    throw new ConflictException(
      `You are already participating in "${activeCampaign.name}". Leave it first to join another campaign.`,
    );
  }

  private async assertEligible(userId: string, campaign: { id: string }) {
    const hasEntry = await this.prisma.entry.findFirst({
      where: { userId, campaignId: campaign.id, isValid: true },
      select: { id: true },
    });
    if (hasEntry)
      throw new BadRequestException('Entry limit reached for this campaign');
  }

  private async processWinEngine(
    userId: string,
    campaign: {
      id: string;
      type: CampaignType;
      everyN: number | null;
      winProbability: number | null;
      rewards: { id: string; inventory: number | null; allocated: number; expiresInHours: number | null }[];
    },
    _entryId: string,
  ) {
    const reward = campaign.rewards[0];
    if (!reward) return null;
    if (reward.inventory !== null && reward.allocated >= reward.inventory) return null;

    let didWin = false;

    switch (campaign.type) {
      case CampaignType.INSTANT_WIN:
        didWin = true;
        break;
      case CampaignType.WEIGHTED_ODDS:
        didWin = Math.random() < (campaign.winProbability ?? 0);
        break;
      case CampaignType.EVERY_N: {
        if (!campaign.everyN) break;
        const count = await this.prisma.entry.count({ where: { campaignId: campaign.id, isValid: true } });
        didWin = count % campaign.everyN === 0;
        break;
      }
      case CampaignType.RAFFLE:
        return null;
    }

    if (!didWin) return null;

    const expiresAt = reward.expiresInHours
      ? new Date(Date.now() + reward.expiresInHours * 3_600_000)
      : null;

    const [userReward] = await this.prisma.$transaction([
      this.prisma.userReward.create({
        data: { userId, rewardId: reward.id, expiresAt, code: generateCode() },
        include: { reward: true },
      }),
      this.prisma.reward.update({
        where: { id: reward.id },
        data: { allocated: { increment: 1 } },
      }),
    ]);

    return userReward;
  }

  async getEntryStatus(entryId: string) {
    const entry = await this.prisma.entry.findUnique({
      where: { id: entryId },
      include: { campaign: { select: { name: true, type: true } } },
    });
    if (!entry) throw new NotFoundException('Entry not found');
    return entry;
  }
}
