import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [users, businesses, campaigns, entries] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.business.count(),
      this.prisma.campaign.count(),
      this.prisma.entry.count(),
    ]);
    return { users, businesses, campaigns, entries };
  }

  async listBusinesses(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.business.findMany({
        skip, take: limit,
        include: { subscription: true, _count: { select: { campaigns: true, employees: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.business.count(),
    ]);
    return { data, total, page, limit };
  }

  async listUsers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip, take: limit,
        select: { id: true, fullName: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);
    return { data, total, page, limit };
  }

  async toggleBusinessStatus(id: string, isActive: boolean) {
    return this.prisma.business.update({ where: { id }, data: { isActive } });
  }

  async toggleUserStatus(id: string, isActive: boolean) {
    return this.prisma.user.update({ where: { id }, data: { isActive } });
  }
}
