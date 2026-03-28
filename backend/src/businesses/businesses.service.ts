import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/create-business.dto';
import { haversineMeters } from '../common/geo.util';

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
      include: { subscription: true, _count: { select: { campaigns: true, employees: true } } },
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

  async findForDiscover(lat?: number, lng?: number) {
    const now = new Date();
    const businesses = await this.prisma.business.findMany({
      where: { lat: { not: null }, lng: { not: null } },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        address: true,
        city: true,
        lat: true,
        lng: true,
        campaigns: {
          where: {
            status: CampaignStatus.ACTIVE,
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          },
          select: {
            id: true,
            name: true,
            type: true,
            endsAt: true,
            _count: { select: { entries: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      take: 300,
    });

    const userLat = lat ? Number(lat) : null;
    const userLng = lng ? Number(lng) : null;

    const withDist = businesses.map((b) => ({
      ...b,
      _distanceMeters:
        userLat && userLng && b.lat != null && b.lng != null
          ? haversineMeters(userLat, userLng, b.lat, b.lng)
          : null,
    }));

    if (userLat && userLng) {
      return withDist.sort(
        (a, b) => (a._distanceMeters ?? Infinity) - (b._distanceMeters ?? Infinity),
      );
    }

    return withDist;
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
      include: {
        _count: { select: { entries: true } },
        rewards: true,
        business: { select: { id: true, name: true, logoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
