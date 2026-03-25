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

  async getBusinessDashboard(businessId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalEntries, totalWinners, totalRedemptions, campaigns, entriesByDayRaw, methodBreakdown, rewardStatusBreakdown] =
      await Promise.all([
        this.prisma.entry.count({ where: { campaign: { businessId }, isValid: true } }),
        this.prisma.userReward.count({ where: { reward: { campaign: { businessId } } } }),
        this.prisma.redemption.count({ where: { userReward: { reward: { campaign: { businessId } } } } }),
        this.prisma.campaign.findMany({
          where: { businessId },
          select: { id: true, name: true, status: true, type: true, endsAt: true, _count: { select: { entries: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
          SELECT DATE_TRUNC('day', e."createdAt") AS day, COUNT(*) AS count
          FROM entries e
          JOIN campaigns c ON c.id = e."campaignId"
          WHERE c."businessId" = ${businessId}
            AND e."isValid" = true
            AND e."createdAt" >= ${thirtyDaysAgo}
          GROUP BY day ORDER BY day ASC
        `,
        this.prisma.entry.groupBy({
          by: ['method'],
          where: { campaign: { businessId }, isValid: true },
          _count: { _all: true },
        }),
        this.prisma.userReward.groupBy({
          by: ['status'],
          where: { reward: { campaign: { businessId } } },
          _count: { _all: true },
        }),
      ]);

    const campaignStats = await Promise.all(
      campaigns.map(async (c) => {
        const winners = await this.prisma.userReward.count({ where: { reward: { campaignId: c.id } } });
        const entries = c._count.entries;
        return { ...c, winners, conversionRate: entries > 0 ? (winners / entries) * 100 : 0 };
      }),
    );

    return {
      totals: {
        entries: totalEntries,
        winners: totalWinners,
        redemptions: totalRedemptions,
        conversionRate: totalEntries > 0 ? (totalWinners / totalEntries) * 100 : 0,
        redemptionRate: totalWinners > 0 ? (totalRedemptions / totalWinners) * 100 : 0,
      },
      entriesByDay: entriesByDayRaw.map((r) => ({ date: r.day.toISOString().slice(0, 10), count: Number(r.count) })),
      campaignStats,
      methodBreakdown: methodBreakdown.map((m) => ({ method: m.method, count: m._count._all })),
      rewardStatusBreakdown: rewardStatusBreakdown.map((r) => ({ status: r.status, count: r._count._all })),
    };
  }
}
