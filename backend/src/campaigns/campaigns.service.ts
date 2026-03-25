import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { CampaignStatus, CampaignType, SubscriptionPlan, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PLAN_LIMITS } from '../billing/billing.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { haversineMeters } from '../common/geo.util';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(businessId: string, dto: CreateCampaignDto) {
    await this.enforcePlanLimits(businessId, dto.type as CampaignType);

    const campaign = await this.prisma.campaign.create({
      data: {
        businessId,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        maxEntries: dto.maxEntries,
        maxEntriesPerUser: 1,
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

  async findOne(id: string, userId?: string) {
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

    if (userId) {
      const myEntry = await this.prisma.entry.findFirst({
        where: { campaignId: id, userId },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      return { ...campaign, myEntry: myEntry ?? null };
    }

    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (
      campaign.status === CampaignStatus.ENDED ||
      campaign.status === CampaignStatus.CANCELLED
    ) {
      throw new BadRequestException('Cannot edit a finished or cancelled campaign');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(dto.startsAt !== undefined && { startsAt: dto.startsAt ? new Date(dto.startsAt) : null }),
        ...(dto.endsAt !== undefined && { endsAt: dto.endsAt ? new Date(dto.endsAt) : null }),
        ...(dto.everyN !== undefined && { everyN: dto.everyN }),
        ...(dto.winProbability !== undefined && { winProbability: dto.winProbability }),
        ...(dto.pushTitle !== undefined && { pushTitle: dto.pushTitle || null }),
        ...(dto.pushBody !== undefined && { pushBody: dto.pushBody || null }),
        ...(dto.budget !== undefined && { budget: dto.budget }),
      },
    });
  }

  async duplicate(id: string) {
    const src = await this.prisma.campaign.findUnique({
      where: { id },
      include: { branches: true, products: true, rewards: true },
    });
    if (!src) throw new NotFoundException('Campaign not found');

    return this.prisma.campaign.create({
      data: {
        businessId: src.businessId,
        name: `${src.name} (copy)`,
        description: src.description,
        type: src.type,
        status: 'DRAFT',
        startsAt: null,
        endsAt: src.endsAt,
        maxEntries: src.maxEntries,
        maxEntriesPerUser: src.maxEntriesPerUser,
        everyN: src.everyN,
        winProbability: src.winProbability,
        pushTitle: src.pushTitle,
        pushBody: src.pushBody,
        budget: src.budget,
        branches: src.branches.length
          ? { create: src.branches.map((b) => ({ branchId: b.branchId })) }
          : undefined,
        products: src.products.length
          ? { create: src.products.map((p) => ({ productId: p.productId, minQuantity: p.minQuantity })) }
          : undefined,
        rewards: src.rewards.length
          ? { create: src.rewards.map((r) => ({ name: r.name, description: r.description, inventory: r.inventory, expiresInHours: r.expiresInHours })) }
          : undefined,
      },
      include: { branches: true, products: true, rewards: true },
    });
  }

  async findByBusiness(businessId: string) {
    return this.prisma.campaign.findMany({
      where: { businessId },
      include: { _count: { select: { entries: true } }, rewards: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(lat?: number, lng?: number, radius = 10000) {
    const now = new Date();
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        status: CampaignStatus.ACTIVE,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      include: {
        business: { select: { id: true, name: true, logoUrl: true } },
        branches: { include: { branch: { select: { lat: true, lng: true, address: true } } } },
        rewards: true,
        _count: { select: { entries: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const userLat = lat ? Number(lat) : null;
    const userLng = lng ? Number(lng) : null;

    if (!userLat || !userLng) return campaigns;

    const radiusM = Number(radius);

    return campaigns
      .map((c) => {
        const distances = c.branches
          .filter((b) => b.branch.lat != null && b.branch.lng != null)
          .map((b) => haversineMeters(userLat, userLng, b.branch.lat!, b.branch.lng!));
        const minDist = distances.length ? Math.min(...distances) : Infinity;
        return { ...c, _distanceMeters: minDist };
      })
      .filter((c) => c._distanceMeters <= radiusM || c.branches.length === 0)
      .sort((a, b) => a._distanceMeters - b._distanceMeters);
  }

  async updateStatus(id: string, status: CampaignStatus, requesterId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { rewards: { select: { id: true }, take: 1 } },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    this.validateTransition(campaign.status, status);

    if (status === CampaignStatus.ACTIVE && campaign.rewards.length === 0) {
      throw new BadRequestException(
        'Cannot publish a campaign with no rewards. Add at least one reward first.',
      );
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status },
    });

    // Auto-notify nearby customers when campaign goes live
    if (status === CampaignStatus.ACTIVE) {
      this.notifications.sendNearbyNotification(id).catch((err) =>
        this.logger.error(`Failed to send campaign notification for ${id}`, err),
      );
    }

    return updated;
  }

  async getAnalytics(id: string) {
    const [campaign, entryCount, rewardCount, redemptionCount, recentEntries] = await Promise.all([
      this.prisma.campaign.findUnique({ where: { id } }),
      this.prisma.entry.count({ where: { campaignId: id, isValid: true } }),
      this.prisma.userReward.count({ where: { reward: { campaignId: id } } }),
      this.prisma.redemption.count({ where: { userReward: { reward: { campaignId: id } } } }),
      this.prisma.entry.findMany({
        where: { campaignId: id, isValid: true },
        include: { user: { select: { id: true, fullName: true, phone: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
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
      recentEntries,
    };
  }

  private async enforcePlanLimits(businessId: string, type: CampaignType) {
    const sub = await this.prisma.subscription.findUnique({ where: { businessId } });
    const plan = sub?.plan ?? SubscriptionPlan.FREE;
    const limit = PLAN_LIMITS[plan];

    // SNAKE campaigns require at least STARTER
    if (type === CampaignType.SNAKE && plan === SubscriptionPlan.FREE) {
      throw new ForbiddenException({
        message: 'Snake campaigns require the STARTER plan or higher',
        requiredPlan: SubscriptionPlan.STARTER,
        currentPlan: plan,
      });
    }

    if (limit < Infinity) {
      const activeCount = await this.prisma.campaign.count({
        where: {
          businessId,
          status: { in: [CampaignStatus.ACTIVE, CampaignStatus.SCHEDULED, CampaignStatus.PAUSED] },
        },
      });
      if (activeCount >= limit) {
        throw new ForbiddenException({
          message: `Campaign limit reached for your ${plan} plan (max ${limit} active campaigns)`,
          currentPlan: plan,
          limit,
        });
      }
    }
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
