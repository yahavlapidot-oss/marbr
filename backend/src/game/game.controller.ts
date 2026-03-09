import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { GameService } from './game.service';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('game')
@ApiBearerAuth()
@Controller('game/snake')
export class GameController {
  constructor(private readonly svc: GameService) {}

  @Post(':campaignId/start')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Start a snake game session — returns a signed game token' })
  start(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.svc.startGame(campaignId, user.id);
  }

  @Post(':campaignId/submit')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit final snake game score' })
  submit(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SubmitScoreDto,
  ) {
    return this.svc.submitScore(user.id, campaignId, dto);
  }

  @Get(':campaignId/leaderboard')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get live leaderboard (top 10 + your rank)' })
  leaderboard(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.svc.getLeaderboard(campaignId, user.id);
  }

  @Post(':campaignId/draw')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Draw winners after campaign ends (owner/manager only)' })
  draw(@Param('campaignId') campaignId: string) {
    return this.svc.drawWinners(campaignId);
  }
}
