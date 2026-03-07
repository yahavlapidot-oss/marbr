import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InviteEmployeeDto, UpdateEmployeeRoleDto } from './dto/invite-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async invite(businessId: string, dto: InviteEmployeeDto) {
    let user = await this.prisma.user.findFirst({ where: { email: dto.email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { fullName: dto.email.split('@')[0], email: dto.email },
      });
    }

    const existing = await this.prisma.employee.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
    });
    if (existing?.isActive) throw new ConflictException('User is already an employee');

    if (existing) {
      return this.prisma.employee.update({
        where: { id: existing.id },
        data: { role: dto.role, branchId: dto.branchId, isActive: true },
        include: { user: { select: { id: true, fullName: true, email: true } } },
      });
    }

    return this.prisma.employee.create({
      data: { userId: user.id, businessId, role: dto.role, branchId: dto.branchId },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async findByBusiness(businessId: string) {
    return this.prisma.employee.findMany({
      where: { businessId, isActive: true },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { invitedAt: 'desc' },
    });
  }

  async updateRole(id: string, dto: UpdateEmployeeRoleDto) {
    return this.prisma.employee.update({ where: { id }, data: { role: dto.role } });
  }

  async revoke(id: string) {
    await this.prisma.employee.update({ where: { id }, data: { isActive: false } });
    return { message: 'Access revoked' };
  }
}
