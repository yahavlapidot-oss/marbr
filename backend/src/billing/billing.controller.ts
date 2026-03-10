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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BillingService } from './billing.service';

class CheckoutDto {
  @IsString()
  @IsIn(['STARTER', 'GROWTH', 'ENTERPRISE'])
  plan: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
}

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('subscription')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  getSubscription(@Query('businessId') businessId: string) {
    if (!businessId) throw new BadRequestException('businessId is required');
    return this.billing.getSubscription(businessId);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  createCheckout(@Query('businessId') businessId: string, @Body() body: CheckoutDto) {
    if (!businessId) throw new BadRequestException('businessId is required');
    return this.billing.createCheckoutSession(businessId, body.plan);
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  createPortal(@Query('businessId') businessId: string) {
    if (!businessId) throw new BadRequestException('businessId is required');
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
