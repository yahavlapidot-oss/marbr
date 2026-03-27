import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CampaignStatus, CampaignType } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { generateCode } from '../common/code.util';
import { ConfigService } from '@nestjs/config';
import { SubmitScoreDto } from './dto/submit-score.dto';

const GAME_TOKEN_EXPIRY = '15m';
const MIN_MS_PER_FOOD = 400; // anti-cheat: can't eat faster than 400ms/food

function expectedScore(foodEaten: number): number {
  return foodEaten * (foodEaten + 1) * 5;
}

@Injectable()
export class GameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── Start a snake game session ────────────────────────────────────────────
  async startGame(campaignId: string, userId: string): Promise<{ gameToken: string }> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.type !== CampaignType.SNAKE) throw new BadRequestException('Not a Snake campaign');
    if (campaign.status !== CampaignStatus.ACTIVE) throw new BadRequestException('Campaign is not active');

    // Check if already played
    const existing = await this.prisma.gameScore.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    });
    if (existing) throw new ConflictException('You have already played this campaign');

    const secret = this.config.get<string>('JWT_ACCESS_SECRET', 'game-secret');
    const gameToken = jwt.sign({ campaignId, userId, type: 'snake_game' }, secret, {
      expiresIn: GAME_TOKEN_EXPIRY,
    });

    return { gameToken };
  }

  // ─── Submit final score ─────────────────────────────────────────────────────
  async submitScore(userId: string, campaignId: string, dto: SubmitScoreDto) {
    // Verify game token
    const secret = this.config.get<string>('JWT_ACCESS_SECRET', 'game-secret');
    let payload: { campaignId: string; userId: string; type: string };
    try {
      payload = jwt.verify(dto.gameToken, secret) as typeof payload;
    } catch {
      throw new BadRequestException('Invalid or expired game token');
    }

    if (payload.campaignId !== campaignId || payload.userId !== userId) {
      throw new ForbiddenException('Game token does not match');
    }
    if (payload.type !== 'snake_game') {
      throw new BadRequestException('Invalid token type');
    }

    // Verify campaign still active
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { rewards: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== CampaignStatus.ACTIVE) throw new BadRequestException('Campaign has ended');

    // Anti-cheat: re-compute expected score
    const computed = expectedScore(dto.foodEaten);
    if (dto.score !== computed) {
      throw new BadRequestException(`Score mismatch: expected ${computed}`);
    }

    // Anti-cheat: minimum duration
    const minDuration = dto.foodEaten * MIN_MS_PER_FOOD;
    if (dto.durationMs < minDuration) {
      throw new BadRequestException('Game duration too short');
    }

    // Save score (unique constraint prevents double submit)
    await this.prisma.gameScore.create({
      data: { campaignId, userId, score: dto.score, foodEaten: dto.foodEaten, durationMs: dto.durationMs },
    });

    // Return rank
    const rank = await this.prisma.gameScore.count({
      where: { campaignId, score: { gte: dto.score } },
    });
    const total = await this.prisma.gameScore.count({ where: { campaignId } });

    return { score: dto.score, foodEaten: dto.foodEaten, rank, totalPlayers: total };
  }

  // ─── Live leaderboard ──────────────────────────────────────────────────────
  async getLeaderboard(campaignId: string, requesterId?: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const top = await this.prisma.gameScore.findMany({
      where: { campaignId },
      orderBy: { score: 'desc' },
      take: 10,
      include: { user: { select: { id: true, fullName: true } } },
    });

    const leaderboard = top.map((g, i) => ({
      rank: i + 1,
      userId: g.userId,
      name: g.user.fullName,
      score: g.score,
      foodEaten: g.foodEaten,
    }));

    let myScore: { score: number; foodEaten: number; rank: number } | null = null;
    if (requesterId) {
      const mine = await this.prisma.gameScore.findUnique({
        where: { campaignId_userId: { campaignId, userId: requesterId } },
      });
      if (mine) {
        const myRank = await this.prisma.gameScore.count({
          where: { campaignId, score: { gt: mine.score } },
        });
        myScore = { score: mine.score, foodEaten: mine.foodEaten, rank: myRank + 1 };
      }
    }

    const totalPlayers = await this.prisma.gameScore.count({ where: { campaignId } });

    return { leaderboard, myScore, totalPlayers };
  }

  // ─── Point Guess: submit score ─────────────────────────────────────────────
  async submitPointGuessScore(
    userId: string,
    campaignId: string,
    dto: { guess: number; actualCount: number; score: number; durationMs: number },
  ) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.type !== CampaignType.POINT_GUESS) throw new BadRequestException('Not a Point Guess campaign');
    if (campaign.status !== CampaignStatus.ACTIVE) throw new BadRequestException('Campaign is not active');

    // Verify score integrity
    const expected = Math.max(0, 100 - Math.abs(dto.guess - dto.actualCount));
    if (dto.score !== expected) throw new BadRequestException('Score mismatch');

    const existing = await this.prisma.gameScore.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    });
    if (existing) throw new ConflictException('You have already submitted a guess for this campaign');

    await this.prisma.gameScore.create({
      data: {
        campaignId,
        userId,
        score: dto.score,
        foodEaten: dto.guess,   // repurpose: stores the user's guess
        durationMs: dto.durationMs,
      },
    });

    const rank = await this.prisma.gameScore.count({
      where: { campaignId, score: { gt: dto.score } },
    });
    const total = await this.prisma.gameScore.count({ where: { campaignId } });

    return { score: dto.score, guess: dto.guess, actualCount: dto.actualCount, rank: rank + 1, totalPlayers: total };
  }

  // ─── Point Guess: leaderboard ──────────────────────────────────────────────
  async getPointGuessLeaderboard(campaignId: string, requesterId?: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const top = await this.prisma.gameScore.findMany({
      where: { campaignId },
      orderBy: { score: 'desc' },
      take: 10,
      include: { user: { select: { id: true, fullName: true } } },
    });

    const leaderboard = top.map((g, i) => ({
      rank: i + 1,
      userId: g.userId,
      name: g.user.fullName,
      score: g.score,
      guess: g.foodEaten, // repurposed field
    }));

    let myScore: { score: number; guess: number; rank: number } | null = null;
    if (requesterId) {
      const mine = await this.prisma.gameScore.findUnique({
        where: { campaignId_userId: { campaignId, userId: requesterId } },
      });
      if (mine) {
        const myRank = await this.prisma.gameScore.count({
          where: { campaignId, score: { gt: mine.score } },
        });
        myScore = { score: mine.score, guess: mine.foodEaten, rank: myRank + 1 };
      }
    }

    const totalPlayers = await this.prisma.gameScore.count({ where: { campaignId } });
    return { leaderboard, myScore, totalPlayers };
  }

  // ─── Point Guess: draw winners ─────────────────────────────────────────────
  async drawPointGuessWinners(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { rewards: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.type !== CampaignType.POINT_GUESS) throw new BadRequestException('Not a Point Guess campaign');
    if (campaign.status !== CampaignStatus.ENDED) throw new BadRequestException('Campaign must be ended to draw winners');

    const reward = campaign.rewards[0];
    if (!reward) throw new BadRequestException('No reward configured');

    const topScores = await this.prisma.gameScore.findMany({
      where: { campaignId },
      orderBy: { score: 'desc' },
      include: { user: { select: { id: true, fullName: true } } },
    });

    const winnersCount = Math.min(reward.inventory ?? 1, topScores.length);
    if (topScores.length === 0) return { winners: [] };

    const selected = topScores.slice(0, winnersCount);
    const expiresAt = reward.expiresInHours
      ? new Date(Date.now() + reward.expiresInHours * 3_600_000)
      : null;

    await Promise.all(
      selected.map((g) =>
        this.prisma.userReward.create({
          data: { userId: g.userId, rewardId: reward.id, expiresAt, code: generateCode() },
        }),
      ),
    );

    await this.prisma.reward.update({
      where: { id: reward.id },
      data: { allocated: { increment: selected.length } },
    });

    return {
      winners: selected.map((g, i) => ({
        rank: i + 1,
        userId: g.userId,
        name: g.user.fullName,
        score: g.score,
        guess: g.foodEaten,
      })),
    };
  }

  // ─── Draw winners (staff action) ───────────────────────────────────────────
  async drawWinners(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { rewards: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.type !== CampaignType.SNAKE) throw new BadRequestException('Not a Snake campaign');
    if (campaign.status !== CampaignStatus.ENDED) throw new BadRequestException('Campaign must be ended to draw winners');

    const reward = campaign.rewards[0];
    if (!reward) throw new BadRequestException('No reward configured for this campaign');

    const topScores = await this.prisma.gameScore.findMany({
      where: { campaignId },
      orderBy: { score: 'desc' },
      include: { user: { select: { id: true, fullName: true } } },
    });

    // Winners cannot exceed actual players
    const winnersCount = Math.min(reward.inventory ?? 1, topScores.length);

    if (topScores.length === 0) return { winners: [] };

    const selectedWinners = topScores.slice(0, winnersCount);

    const expiresAt = reward.expiresInHours
      ? new Date(Date.now() + reward.expiresInHours * 3_600_000)
      : null;

    await Promise.all(
      selectedWinners.map((g) =>
        this.prisma.userReward.create({
          data: { userId: g.userId, rewardId: reward.id, expiresAt, code: generateCode() },
        }),
      ),
    );

    await this.prisma.reward.update({
      where: { id: reward.id },
      data: { allocated: { increment: selectedWinners.length } },
    });

    return {
      winners: selectedWinners.map((g, i) => ({
        rank: i + 1,
        userId: g.userId,
        name: g.user.fullName,
        score: g.score,
      })),
    };
  }
}
