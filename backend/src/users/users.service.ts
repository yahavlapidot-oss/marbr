import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        city: true,
        avatarUrl: true,
        role: true,
        marketingConsent: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        city: dto.city,
        gender: dto.gender,
        marketingConsent: dto.marketingConsent,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        city: true,
        gender: true,
        marketingConsent: true,
      },
    });
  }

  async deleteMe(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false, email: null, phone: null },
    });
    return { message: 'Account deleted' };
  }

  async getMyRewards(userId: string) {
    return this.prisma.userReward.findMany({
      where: { userId },
      include: {
        reward: {
          include: { campaign: { select: { name: true, businessId: true } } },
        },
      },
      orderBy: { wonAt: 'desc' },
    });
  }

  async getMyHistory(userId: string) {
    return this.prisma.entry.findMany({
      where: { userId },
      include: {
        campaign: { select: { id: true, name: true, businessId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getMyNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getFavorites(userId: string) {
    return this.prisma.favoriteBusiness.findMany({
      where: { userId },
      include: {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
      },
    });
  }

  async toggleFavorite(userId: string, businessId: string) {
    const existing = await this.prisma.favoriteBusiness.findUnique({
      where: { userId_businessId: { userId, businessId } },
    });

    if (existing) {
      await this.prisma.favoriteBusiness.delete({
        where: { userId_businessId: { userId, businessId } },
      });
      return { favorited: false };
    }

    await this.prisma.favoriteBusiness.create({ data: { userId, businessId } });
    return { favorited: true };
  }
}
