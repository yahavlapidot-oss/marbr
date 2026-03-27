import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RewardStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedeemDto } from './dto/redeem.dto';

@Injectable()
export class RedemptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async redeem(staffUserId: string, dto: RedeemDto) {
    const userReward = await this.prisma.userReward.findUnique({
      where: { code: dto.code },
      include: { reward: { include: { campaign: true } } },
    });

    if (!userReward) throw new NotFoundException('Reward not found');

    if (userReward.status !== RewardStatus.ACTIVE) {
      throw new BadRequestException(`Reward is already ${userReward.status.toLowerCase()}`);
    }

    if (userReward.expiresAt && userReward.expiresAt < new Date()) {
      await this.prisma.userReward.update({
        where: { id: userReward.id },
        data: { status: RewardStatus.EXPIRED },
      });
      throw new BadRequestException('Reward has expired');
    }

    const [redemption] = await this.prisma.$transaction([
      this.prisma.redemption.create({
        data: {
          userRewardId: userReward.id,
          staffUserId,
          notes: dto.notes,
        },
        include: { userReward: { include: { reward: true } } },
      }),
      this.prisma.userReward.update({
        where: { id: userReward.id },
        data: { status: RewardStatus.REDEEMED, redeemedAt: new Date() },
      }),
    ]);

    return redemption;
  }

  async getRewardByCode(code: string) {
    const userReward = await this.prisma.userReward.findUnique({
      where: { code },
      include: {
        reward: { include: { campaign: { select: { name: true } } } },
        user: { select: { fullName: true } },
      },
    });

    if (!userReward) throw new NotFoundException('Reward not found');
    return userReward;
  }
}
