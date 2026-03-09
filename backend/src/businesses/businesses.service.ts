import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/create-business.dto';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateBusinessDto) {
    const business = await this.prisma.business.create({ data: { ...dto } });
    await Promise.all([
      this.prisma.employee.create({
        data: { userId: ownerId, businessId: business.id, role: 'OWNER', acceptedAt: new Date() },
      }),
      this.prisma.subscription.create({ data: { businessId: business.id } }),
      this.prisma.user.update({ where: { id: ownerId }, data: { role: 'OWNER' } }),
    ]);
    return business;
  }

  async findOne(id: string) {
    const b = await this.prisma.business.findUnique({
      where: { id },
      include: { branches: true, subscription: true, _count: { select: { campaigns: true, employees: true } } },
    });
    if (!b) throw new NotFoundException('Business not found');
    return b;
  }

  async update(id: string, dto: UpdateBusinessDto) {
    return this.prisma.business.update({ where: { id }, data: dto });
  }

  async findByUser(userId: string) {
    const employments = await this.prisma.employee.findMany({
      where: { userId, isActive: true },
      include: { business: { include: { _count: { select: { campaigns: true } } } } },
    });
    return employments.map((e) => ({ ...e.business, role: e.role }));
  }

  async getCampaigns(businessId: string, requesterId: string) {
    // Ensure requester belongs to this business (or is an admin)
    const [employee, user] = await Promise.all([
      this.prisma.employee.findFirst({ where: { userId: requesterId, businessId, isActive: true } }),
      this.prisma.user.findUnique({ where: { id: requesterId }, select: { role: true } }),
    ]);
    if (!employee && user?.role !== 'ADMIN') {
      throw new ForbiddenException('You do not have access to this business');
    }

    return this.prisma.campaign.findMany({
      where: { businessId },
      include: { _count: { select: { entries: true } }, rewards: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCustomers(businessId: string) {
    const entries = await this.prisma.entry.findMany({
      where: { campaign: { businessId } },
      include: { user: { select: { id: true, fullName: true, email: true, phone: true, createdAt: true } } },
      distinct: ['userId'],
    });
    return entries.map((e) => e.user);
  }
}
