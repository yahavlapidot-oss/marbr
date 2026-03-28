import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertBusinessEmployee(userId: string, userRole: UserRole, businessId: string): Promise<void> {
    if (userRole === UserRole.ADMIN) return;
    const employee = await this.prisma.employee.findFirst({ where: { userId, businessId, isActive: true } });
    if (!employee) throw new ForbiddenException('You do not have access to this resource');
  }

  async create(businessId: string, dto: CreateProductDto, userId: string, userRole: UserRole) {
    await this.assertBusinessEmployee(userId, userRole, businessId);
    return this.prisma.product.create({ data: { businessId, ...dto } });
  }

  async findByBusiness(businessId: string) {
    return this.prisma.product.findMany({ where: { businessId }, orderBy: { name: 'asc' } });
  }

  async update(id: string, dto: UpdateProductDto, userId: string, userRole: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      const product = await this.prisma.product.findUnique({ where: { id }, select: { businessId: true } });
      if (!product) throw new NotFoundException('Product not found');
      await this.assertBusinessEmployee(userId, userRole, product.businessId);
    }
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string, userRole: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      const product = await this.prisma.product.findUnique({ where: { id }, select: { businessId: true } });
      if (!product) throw new NotFoundException('Product not found');
      await this.assertBusinessEmployee(userId, userRole, product.businessId);
    }
    return this.prisma.product.delete({ where: { id } });
  }
}
