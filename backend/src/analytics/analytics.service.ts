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
          include: {
            products: { include: { product: { select: { price: true } } } },
            rewards: {
              include: {
                product: { select: { price: true } },
                _count: { select: { userRewards: { where: { status: 'REDEEMED' } } } },
              },
            },
            _count: { select: { entries: { where: { isValid: true } } } },
          },
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
        const financials = this.computeFinancials(entries, c.products as any, c.rewards as any);
        return { ...c, winners, conversionRate: entries > 0 ? (winners / entries) * 100 : 0, ...financials };
      }),
    );

    const totalRevenue = campaignStats.reduce((sum, c) => sum + c.revenue, 0);
    const totalRewardCost = campaignStats.reduce((sum, c) => sum + c.rewardCost, 0);
    const totalNetProfit = totalRevenue - totalRewardCost;
    const totalRoi = totalRewardCost > 0 ? (totalNetProfit / totalRewardCost) * 100 : null;

    return {
      totals: {
        entries: totalEntries,
        winners: totalWinners,
        redemptions: totalRedemptions,
        conversionRate: totalEntries > 0 ? (totalWinners / totalEntries) * 100 : 0,
        redemptionRate: totalWinners > 0 ? (totalRedemptions / totalWinners) * 100 : 0,
        revenue: totalRevenue,
        rewardCost: totalRewardCost,
        netProfit: totalNetProfit,
        roi: totalRoi,
      },
      entriesByDay: entriesByDayRaw.map((r) => ({ date: r.day.toISOString().slice(0, 10), count: Number(r.count) })),
      campaignStats,
      methodBreakdown: methodBreakdown.map((m) => ({ method: m.method, count: m._count._all })),
      rewardStatusBreakdown: rewardStatusBreakdown.map((r) => ({ status: r.status, count: r._count._all })),
    };
  }

  private computeFinancials(
    entryCount: number,
    products: Array<{ minQuantity: number; product: { price: number | null } | null }>,
    rewards: Array<{ quantity: number; product: { price: number | null } | null; _count: { userRewards: number } }>,
  ) {
    const revenuePerEntry = products.reduce(
      (sum, cp) => sum + (cp.product?.price ?? 0) * cp.minQuantity,
      0,
    );
    const revenue = entryCount * revenuePerEntry;
    const rewardCost = rewards.reduce(
      (sum, r) => sum + r._count.userRewards * (r.quantity ?? 1) * (r.product?.price ?? 0),
      0,
    );
    const netProfit = revenue - rewardCost;
    const roi = rewardCost > 0 ? (netProfit / rewardCost) * 100 : null;
    return { revenue, rewardCost, netProfit, roi, purchases: entryCount };
  }
}
