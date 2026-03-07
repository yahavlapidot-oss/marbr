import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CampaignStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(businessId: string, dto: CreateCampaignDto) {
    const campaign = await this.prisma.campaign.create({
      data: {
        businessId,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        maxEntries: dto.maxEntries,
        maxEntriesPerUser: dto.maxEntriesPerUser ?? 1,
        everyN: dto.everyN,
        winProbability: dto.winProbability,
        pushTitle: dto.pushTitle,
        pushBody: dto.pushBody,
        budget: dto.budget,
        branches: dto.branchIds?.length
          ? { create: dto.branchIds.map((branchId) => ({ branchId })) }
          : undefined,
        products: dto.productIds?.length
          ? { create: dto.productIds.map((productId) => ({ productId })) }
          : undefined,
      },
      include: { branches: true, products: true, rewards: true },
    });

    return campaign;
  }

  async findOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        branches: { include: { branch: true } },
        products: { include: { product: true } },
        rewards: true,
        _count: { select: { entries: true } },
      },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async findByBusiness(businessId: string) {
    return this.prisma.campaign.findMany({
      where: { businessId },
      include: { _count: { select: { entries: true } }, rewards: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(lat?: number, lng?: number, radius = 5000) {
    const now = new Date();
    return this.prisma.campaign.findMany({
      where: {
        status: CampaignStatus.ACTIVE,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        startsAt: { lte: now },
      },
      include: {
        business: { select: { id: true, name: true, logoUrl: true } },
        branches: { include: { branch: { select: { lat: true, lng: true, address: true } } } },
        rewards: true,
        _count: { select: { entries: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async updateStatus(id: string, status: CampaignStatus, requesterId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    this.validateTransition(campaign.status, status);

    return this.prisma.campaign.update({
      where: { id },
      data: { status },
    });
  }

  async getAnalytics(id: string) {
    const [campaign, entryCount, rewardCount, redemptionCount] = await Promise.all([
      this.prisma.campaign.findUnique({ where: { id } }),
      this.prisma.entry.count({ where: { campaignId: id, isValid: true } }),
      this.prisma.userReward.count({
        where: { reward: { campaignId: id } },
      }),
      this.prisma.redemption.count({
        where: { userReward: { reward: { campaignId: id } } },
      }),
    ]);

    if (!campaign) throw new NotFoundException('Campaign not found');

    return {
      campaign,
      stats: {
        totalEntries: entryCount,
        totalWinners: rewardCount,
        totalRedemptions: redemptionCount,
        conversionRate: entryCount > 0 ? (rewardCount / entryCount) * 100 : 0,
        redemptionRate: rewardCount > 0 ? (redemptionCount / rewardCount) * 100 : 0,
      },
    };
  }

  private validateTransition(current: CampaignStatus, next: CampaignStatus) {
    const allowed: Record<CampaignStatus, CampaignStatus[]> = {
      DRAFT: [CampaignStatus.SCHEDULED, CampaignStatus.ACTIVE, CampaignStatus.CANCELLED],
      SCHEDULED: [CampaignStatus.ACTIVE, CampaignStatus.CANCELLED],
      ACTIVE: [CampaignStatus.PAUSED, CampaignStatus.ENDED],
      PAUSED: [CampaignStatus.ACTIVE, CampaignStatus.ENDED],
      ENDED: [],
      CANCELLED: [],
    };

    if (!allowed[current].includes(next)) {
      throw new BadRequestException(
        `Cannot transition campaign from ${current} to ${next}`,
      );
    }
  }
}
