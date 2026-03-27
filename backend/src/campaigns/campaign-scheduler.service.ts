import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CampaignStatus, CampaignType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RewardsService } from '../rewards/rewards.service';
import { generateCode } from '../common/code.util';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CampaignSchedulerService {
  private readonly logger = new Logger(CampaignSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rewards: RewardsService,
    private readonly notifications: NotificationsService,
  ) {}

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
        await this.endAndAnnounce(campaign);
      } catch (err) {
        this.logger.error(`Failed to auto-end campaign ${campaign.id}: ${err}`);
      }
    }
  }

  private async endAndAnnounce(campaign: {
    id: string;
    name: string;
    type: CampaignType;
    rewards: { id: string; name: string; inventory: number | null; expiresInHours: number | null }[];
    business: { name: string };
  }) {
    this.logger.log(`Auto-ending campaign "${campaign.name}" (${campaign.id})`);

    // 1. Mark ENDED first so no new entries come in
    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: CampaignStatus.ENDED },
    });

    // 2. Draw winners
    const winnerUserIds: string[] = [];
    const reward = campaign.rewards[0];

    if (reward) {
      if (campaign.type === CampaignType.RAFFLE) {
        const result = await this.rewards.drawRaffleWinners(campaign.id);
        winnerUserIds.push(...(result.userIds ?? []));
      } else if (campaign.type === CampaignType.SNAKE) {
        const count = reward.inventory ?? 1;
        const topScores = await this.prisma.gameScore.findMany({
          where: { campaignId: campaign.id },
          orderBy: { score: 'desc' },
          take: count,
        });

        for (const score of topScores) {
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
        }

        if (topScores.length > 0) {
          await this.prisma.reward.update({
            where: { id: reward.id },
            data: { allocated: { increment: topScores.length } },
          });
        }

        winnerUserIds.push(...topScores.map((s) => s.userId));
      }
    }

    // 3. Push notification → winners
    if (winnerUserIds.length > 0) {
      await this.notifications.sendPush({
        userIds: winnerUserIds,
        title: '🎉 זכית!',
        body: `מזל טוב! זכית ב"${reward?.name}" מ-${campaign.business.name}. פתח את MrBar למימוש הפרס!`,
        data: { type: 'campaign_winner', campaignId: campaign.id },
      }).catch((err) => this.logger.error('Winner push failed', err));
    }

    // 4. Push notification → other participants (non-winners)
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
      `Campaign "${campaign.name}" ended — ${winnerUserIds.length} winner(s), ${nonWinners.length} notified`,
    );
  }
}
