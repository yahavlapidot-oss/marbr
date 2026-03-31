import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';

class CheckoutDto {
  @IsString()
  @IsIn(['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'])
  plan: 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';
}

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly prisma: PrismaService,
  ) {}

  private async assertOwnership(userId: string, userRole: UserRole, businessId: string) {
    if (userRole === UserRole.ADMIN) return;
    const employee = await this.prisma.employee.findFirst({
      where: { userId, businessId, isActive: true, role: UserRole.OWNER },
    });
    if (!employee) throw new ForbiddenException('You do not have access to this business billing');
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getSubscription(
    @Query('businessId') businessId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    if (!businessId) throw new BadRequestException('businessId is required');
    await this.assertOwnership(user.id, user.role, businessId);
    return this.billing.getSubscription(businessId);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async createCheckout(
    @Query('businessId') businessId: string,
    @Body() body: CheckoutDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    if (!businessId) throw new BadRequestException('businessId is required');
    await this.assertOwnership(user.id, user.role, businessId);
    return this.billing.changePlan(businessId, body.plan);
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async createPortal(
    @Query('businessId') businessId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    if (!businessId) throw new BadRequestException('businessId is required');
    await this.assertOwnership(user.id, user.role, businessId);
    return this.billing.createPortalSession(businessId);
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) throw new BadRequestException('Missing raw body');
    return this.billing.handleWebhook(req.rawBody, signature);
  }
}
