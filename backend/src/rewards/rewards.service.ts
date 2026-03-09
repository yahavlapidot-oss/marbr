import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsInt, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRewardDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() inventory?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() expiresInHours?: number;
}

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService) {}

  async createForCampaign(campaignId: string, dto: CreateRewardDto) {
    return this.prisma.reward.create({ data: { campaignId, ...dto } });
  }

  async findByCampaign(campaignId: string) {
    return this.prisma.reward.findMany({ where: { campaignId } });
  }

  async findUserReward(id: string) {
    const r = await this.prisma.userReward.findUnique({
      where: { id },
      include: { reward: { include: { campaign: { select: { name: true, businessId: true } } } } },
    });
    if (!r) throw new NotFoundException('Reward not found');
    return r;
  }

  async drawRaffleWinners(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { rewards: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const reward = campaign.rewards[0];
    if (!reward) return { winners: 0 };

    const winnersCount = reward.inventory ?? 1;
    const entries = await this.prisma.entry.findMany({
      where: { campaignId, isValid: true },
    });

    // Fisher-Yates shuffle (unbiased)
    const shuffled = [...entries];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const winners = shuffled.slice(0, winnersCount);

    await Promise.all(
      winners.map((e) =>
        this.prisma.userReward.create({
          data: {
            userId: e.userId,
            rewardId: reward.id,
            expiresAt: reward.expiresInHours
              ? new Date(Date.now() + reward.expiresInHours * 3_600_000)
              : null,
          },
        }),
      ),
    );

    await this.prisma.reward.update({
      where: { id: reward.id },
      data: { allocated: { increment: winners.length } },
    });

    return { winners: winners.length, userIds: winners.map((e) => e.userId) };
  }
}
