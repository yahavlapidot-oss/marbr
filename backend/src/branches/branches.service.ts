import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/create-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(businessId: string, dto: CreateBranchDto) {
    return this.prisma.branch.create({ data: { businessId, ...dto } });
  }

  async findByBusiness(businessId: string) {
    return this.prisma.branch.findMany({ where: { businessId }, orderBy: { createdAt: 'asc' } });
  }

  async findOne(id: string) {
    const b = await this.prisma.branch.findUnique({
      where: { id },
      include: { employees: { include: { user: { select: { id: true, fullName: true, email: true } } } } },
    });
    if (!b) throw new NotFoundException('Branch not found');
    return b;
  }

  async update(id: string, dto: UpdateBranchDto) {
    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.prisma.branch.update({ where: { id }, data: { isActive: false } });
    return { message: 'Branch deactivated' };
  }
}
