import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { RedemptionsService } from './redemptions.service';
import { RedeemDto } from './dto/redeem.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('redemptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('staff/redeem')
export class RedemptionsController {
  constructor(private readonly redemptionsService: RedemptionsService) {}

  @Get('check/:code')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.BARTENDER, UserRole.CASHIER, UserRole.HOSTESS)
  @ApiOperation({ summary: 'Look up a reward by code before redeeming' })
  check(@Param('code') code: string) {
    return this.redemptionsService.getRewardByCode(code);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.BARTENDER, UserRole.CASHIER, UserRole.HOSTESS)
  @ApiOperation({ summary: 'Mark a customer reward as redeemed' })
  redeem(@CurrentUser() user: { id: string }, @Body() dto: RedeemDto) {
    return this.redemptionsService.redeem(user.id, dto);
  }
}
