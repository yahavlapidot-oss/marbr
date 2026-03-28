import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly svc: ProductsService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create product for a business' })
  create(
    @Query('businessId') businessId: string,
    @Body() dto: CreateProductDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.svc.create(businessId, dto, user.id, user.role);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.BARTENDER, UserRole.CASHIER)
  @ApiOperation({ summary: 'List products for a business' })
  findAll(@Query('businessId') businessId: string) {
    return this.svc.findByBusiness(businessId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.svc.update(id, dto, user.id, user.role);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  remove(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.svc.remove(id, user.id, user.role);
  }
}
