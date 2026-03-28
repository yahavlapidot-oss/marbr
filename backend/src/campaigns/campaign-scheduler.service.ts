import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CampaignStatus, CampaignType, RewardStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RewardsService } from '../rewards/rewards.service';
import { generateCode } from '../common/code.util';
import { NotificationsService } from '../notifications/notifications.service';

type EndableCampaign = {
  id: string;
  name: string;
  type: CampaignType;
  rewards: { id: string; name: string; inventory: number | null; expiresInHours: number | null }[];
  business: { name: string };
};

@Injectable()
export class CampaignSchedulerService {
  private readonly logger = new Logger(CampaignSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rewards: RewardsService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Runs every minute — marks ACTIVE user rewards as EXPIRED when expiresAt has passed. */
  @Cron('* * * * *')
  async autoExpireRewards() {
    const now = new Date();
    const { count } = await this.prisma.userReward.updateMany({
      where: { status: RewardStatus.ACTIVE, expiresAt: { lte: now } },
      data: { status: RewardStatus.EXPIRED },
    });
    if (count > 0) this.logger.log(`Expired ${count} user reward(s)`);
  }

  /** Runs every minute — ends any ACTIVE campaign whose endsAt has passed. */
  @Cron('* * * * *')
  async autoEndExpiredCampaigns() {
    const now = new Date();
    const expired = await this.prisma.campaign.findMany({
      where: { status: CampaignStatus.ACTIVE, endsAt: { lte: now } },
      include: {
        rewards: true,
        business: { select: { name: true } },
      },
    });

    for (const campaign of expired) {
      try {
        // Mark ENDED first so no new entries come in
        await this.prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: CampaignStatus.ENDED },
        });
        await this.drawAndNotify(campaign);
      } catch (err) {
        this.logger.error(`Failed to auto-end campaign ${campaign.id}: ${err}`);
      }
    }
  }

  /**
   * Draws winners for a campaign that is already ENDED and sends push notifications.
   * Called both by the auto-end cron and by manual status transitions.
   */
  async drawAndNotify(campaign: EndableCampaign) {
    this.logger.log(`Drawing winners for campaign "${campaign.name}" (${campaign.id}, type=${campaign.type})`);

    const winnerUserIds: string[] = [];
    const reward = campaign.rewards[0];

    if (reward) {
      if (campaign.type === CampaignType.RAFFLE) {
        const result = await this.rewards.drawRaffleWinners(campaign.id);
        winnerUserIds.push(...(result.userIds ?? []));

      } else if (campaign.type === CampaignType.SNAKE || campaign.type === CampaignType.POINT_GUESS) {
        const allScores = await this.prisma.gameScore.findMany({
          where: { campaignId: campaign.id },
          orderBy: { score: 'desc' },
        });
        const count = Math.min(reward.inventory ?? 1, allScores.length);
        const topScores = allScores.slice(0, count);

        for (const score of topScores) {
          // Skip if already awarded (idempotent)
          const exists = await this.prisma.userReward.findFirst({
            where: { userId: score.userId, rewardId: reward.id },
          });
          if (exists) continue;

          await this.prisma.userReward.create({
            data: {
              userId: score.userId,
              rewardId: reward.id,
              code: generateCode(),
              expiresAt: reward.expiresInHours
                ? new Date(Date.now() + reward.expiresInHours * 3_600_000)
                : null,
            },
          });
          winnerUserIds.push(score.userId);
        }

        if (winnerUserIds.length > 0) {
          await this.prisma.reward.update({
            where: { id: reward.id },
            data: { allocated: { increment: winnerUserIds.length } },
          });
        }

      } else if (campaign.type === CampaignType.EVERY_N) {
        // Winners already awarded during entry — just notify existing winners
        const existingWinners = await this.prisma.userReward.findMany({
          where: { reward: { campaignId: campaign.id } },
          select: { userId: true },
          distinct: ['userId'],
        });
        winnerUserIds.push(...existingWinners.map((w) => w.userId));
      }
    }

    // Push → winners
    if (winnerUserIds.length > 0) {
      await this.notifications.sendPush({
        userIds: winnerUserIds,
        title: '🎉 זכית!',
        body: `מזל טוב! זכית ב"${reward?.name}" מ-${campaign.business.name}. פתח את MrBar למימוש הפרס!`,
        data: { type: 'campaign_winner', campaignId: campaign.id },
      }).catch((err) => this.logger.error('Winner push failed', err));
    }

    // Push → non-winning participants
    const allParticipants = await this.prisma.entry.findMany({
      where: { campaignId: campaign.id, isValid: true },
      select: { userId: true },
      distinct: ['userId'],
    });
    const nonWinners = allParticipants
      .map((e) => e.userId)
      .filter((id) => !winnerUserIds.includes(id));

    if (nonWinners.length > 0) {
      await this.notifications.sendPush({
        userIds: nonWinners,
        title: `${campaign.name} הסתיים`,
        body:
          winnerUserIds.length > 0
            ? `הקמפיין הסתיים. ${winnerUserIds.length} זוכים נבחרו — בהצלחה בפעם הבאה!`
            : 'הקמפיין הסתיים. תודה על ההשתתפות!',
        data: { type: 'campaign_ended', campaignId: campaign.id },
      }).catch((err) => this.logger.error('Participant push failed', err));
    }

    this.logger.log(
      `Campaign "${campaign.name}" — ${winnerUserIds.length} winner(s), ${nonWinners.length} participant(s) notified`,
    );
  }
}
