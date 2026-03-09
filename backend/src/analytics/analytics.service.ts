import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async track(event: string, payload: Record<string, any>, userId?: string, businessId?: string) {
    return this.prisma.eventLog.create({
      data: { event, payload, userId, businessId },
    });
  }

  async getBusinessOverview(businessId: string) {
    const [campaigns, totalEntries, totalWinners, totalRedemptions] = await Promise.all([
      this.prisma.campaign.findMany({
        where: { businessId },
        select: { id: true, name: true, status: true, type: true, _count: { select: { entries: true } } },
      }),
      this.prisma.entry.count({ where: { campaign: { businessId }, isValid: true } }),
      this.prisma.userReward.count({ where: { reward: { campaign: { businessId } } } }),
      this.prisma.redemption.count({ where: { userReward: { reward: { campaign: { businessId } } } } }),
    ]);

    return {
      campaigns,
      totals: { entries: totalEntries, winners: totalWinners, redemptions: totalRedemptions },
      conversionRate: totalEntries > 0 ? (totalWinners / totalEntries) * 100 : 0,
      redemptionRate: totalWinners > 0 ? (totalRedemptions / totalWinners) * 100 : 0,
    };
  }

  async getEventLog(businessId: string, limit = 100) {
    return this.prisma.eventLog.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
