import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Get('business/:businessId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get analytics overview for a business' })
  getOverview(@Param('businessId') businessId: string) {
    return this.svc.getBusinessOverview(businessId);
  }

  @Get('business/:businessId/dashboard')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get full analytics dashboard for a business' })
  getDashboard(@Param('businessId') businessId: string) {
    return this.svc.getBusinessDashboard(businessId);
  }

  @Get('business/:businessId/events')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get event log for a business' })
  getEvents(@Param('businessId') businessId: string) {
    return this.svc.getEventLog(businessId);
  }

  @Post('track')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Track a custom event' })
  track(@Body() body: { event: string; payload?: any; businessId?: string }) {
    return this.svc.track(body.event, body.payload ?? {}, undefined, body.businessId);
  }
}
