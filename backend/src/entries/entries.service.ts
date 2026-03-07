import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CampaignStatus, CampaignType, EntryMethod } from '@prisma/client';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ScanEntryDto } from './dto/scan.dto';

@Injectable()
export class EntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── Staff: generate a time-limited QR for a campaign ───────────────────────
  async generateQr(campaignId: string, branchId: string): Promise<{ qrDataUrl: string; token: string }> {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET', 'qr-secret');
    const token = jwt.sign({ campaignId, branchId, ts: Date.now() }, secret, { expiresIn: '5m' });
    const qrDataUrl = await QRCode.toDataURL(token, { width: 300, margin: 2 });
    return { qrDataUrl, token };
  }

  // ─── Customer: submit entry ──────────────────────────────────────────────────
  async createEntry(userId: string, dto: ScanEntryDto) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: dto.campaignId },
      include: { rewards: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    this.assertCampaignActive(campaign);
    await this.assertEligible(userId, campaign);

    // Verify JWT-signed QR codes
    if (dto.code) {
      const secret = this.config.get<string>('JWT_ACCESS_SECRET', 'qr-secret');
      try {
        jwt.verify(dto.code, secret);
      } catch {
        throw new BadRequestException('QR code is invalid or expired');
      }
    }

    const codeHash = dto.code
      ? crypto.createHash('sha256').update(dto.code).digest('hex')
      : null;

    if (codeHash) {
      const duplicate = await this.prisma.entry.findFirst({
        where: { campaignId: dto.campaignId, codeHash },
      });
      if (duplicate) throw new ConflictException('This code has already been used');
    }

    const entry = await this.prisma.entry.create({
      data: {
        campaignId: dto.campaignId,
        userId,
        method: dto.method,
        codeHash,
        purchaseRef: dto.purchaseRef,
        metadata: { lat: dto.lat, lng: dto.lng },
      },
    });

    const userReward = await this.processWinEngine(userId, campaign, entry.id);
    return { entry, reward: userReward ?? null };
  }

  private assertCampaignActive(campaign: { status: CampaignStatus; startsAt: Date | null; endsAt: Date | null }) {
    const now = new Date();
    if (campaign.status !== CampaignStatus.ACTIVE)
      throw new BadRequestException('Campaign is not active');
    if (campaign.startsAt && campaign.startsAt > now)
      throw new BadRequestException('Campaign has not started yet');
    if (campaign.endsAt && campaign.endsAt < now)
      throw new BadRequestException('Campaign has ended');
  }

  private async assertEligible(userId: string, campaign: { id: string; maxEntriesPerUser: number | null }) {
    if (!campaign.maxEntriesPerUser) return;
    const count = await this.prisma.entry.count({
      where: { userId, campaignId: campaign.id, isValid: true },
    });
    if (count >= campaign.maxEntriesPerUser)
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
        data: { userId, rewardId: reward.id, expiresAt },
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
