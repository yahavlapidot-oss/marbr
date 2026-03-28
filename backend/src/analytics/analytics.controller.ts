import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionPlan, UserRole } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_LIMITS } from '../billing/billing.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly svc: AnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  private async getPlan(businessId: string): Promise<SubscriptionPlan> {
    const sub = await this.prisma.subscription.findUnique({ where: { businessId } });
    return sub?.plan ?? SubscriptionPlan.FREE;
  }

  @Get('business/:businessId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get analytics overview for a business' })
  async getOverview(@Param('businessId') businessId: string) {
    const plan = await this.getPlan(businessId);
    const data = await this.svc.getBusinessOverview(businessId);
    if (!PLAN_LIMITS[plan].financialAnalytics) {
      data.conversionRate = data.conversionRate; // keep engagement metrics
      // financial fields stripped - not present in overview anyway
    }
    return data;
  }

  @Get('business/:businessId/dashboard')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get full analytics dashboard for a business' })
  async getDashboard(@Param('businessId') businessId: string) {
    const plan = await this.getPlan(businessId);
    const data = await this.svc.getBusinessDashboard(businessId);
    if (!PLAN_LIMITS[plan].financialAnalytics) {
      data.totals.revenue = null as any;
      data.totals.rewardCost = null as any;
      data.totals.netProfit = null as any;
      data.totals.roi = null;
      data.campaignStats = data.campaignStats.map((c: any) => ({
        ...c, revenue: null, rewardCost: null, netProfit: null, roi: null,
      }));
    }
    return data;
  }

  @Get('business/:businessId/events')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get event log for a business' })
  async getEvents(@Param('businessId') businessId: string) {
    const plan = await this.getPlan(businessId);
    if (!PLAN_LIMITS[plan].eventLog) return [];
    return this.svc.getEventLog(businessId);
  }

  @Post('track')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Track a custom event' })
  track(@Body() body: { event: string; payload?: any; businessId?: string }) {
    return this.svc.track(body.event, body.payload ?? {}, undefined, body.businessId);
  }
}
