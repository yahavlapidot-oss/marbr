import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { EntriesService } from './entries.service';
import { ScanEntryDto } from './dto/scan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('entries')
export class EntriesController {
  constructor(private readonly svc: EntriesService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a campaign entry (scan or manual code)' })
  createEntry(@CurrentUser() user: { id: string }, @Body() dto: ScanEntryDto) {
    return this.svc.createEntry(user.id, dto);
  }

  @Get('active')
  @ApiOperation({ summary: "Get the user's current active campaign enrollment" })
  getActiveCampaign(@CurrentUser() user: { id: string }) {
    return this.svc.getActiveCampaign(user.id);
  }

  @Delete('active')
  @ApiOperation({ summary: 'Leave the current active campaign' })
  leaveActiveCampaign(@CurrentUser() user: { id: string }) {
    return this.svc.leaveActiveCampaign(user.id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get entry status' })
  getStatus(@Param('id') id: string) {
    return this.svc.getEntryStatus(id);
  }

  @Post('qr/generate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.BARTENDER, UserRole.CASHIER, UserRole.HOSTESS)
  @ApiOperation({ summary: 'Generate a time-limited QR code for staff to show customers' })
  generateQr(@Query('campaignId') campaignId: string, @Query('branchId') branchId: string) {
    return this.svc.generateQr(campaignId, branchId);
  }
}
