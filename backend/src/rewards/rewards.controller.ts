import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { RewardsService, CreateRewardDto } from './rewards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('rewards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rewards')
export class RewardsController {
  constructor(private readonly svc: RewardsService) {}

  @Post('campaign/:campaignId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add reward to campaign' })
  create(@Param('campaignId') campaignId: string, @Body() dto: CreateRewardDto) {
    return this.svc.createForCampaign(campaignId, dto);
  }

  @Get('campaign/:campaignId')
  @ApiOperation({ summary: 'Get rewards for a campaign' })
  findByCampaign(@Param('campaignId') campaignId: string) {
    return this.svc.findByCampaign(campaignId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific user reward' })
  findOne(@Param('id') id: string) {
    return this.svc.findUserReward(id);
  }

  @Post('campaign/:campaignId/draw')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Draw raffle winners for a campaign' })
  draw(@Param('campaignId') campaignId: string) {
    return this.svc.drawRaffleWinners(campaignId);
  }
}
