import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { CampaignType } from '@prisma/client';

export class CreateCampaignDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CampaignType })
  @IsEnum(CampaignType)
  type: CampaignType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxEntries?: number;

  @ApiPropertyOptional({ description: 'For EVERY_N type: win every N entries' })
  @IsOptional()
  @IsInt()
  @Min(2)
  everyN?: number;

  @ApiPropertyOptional({ description: 'For WEIGHTED_ODDS type: win probability 0-1' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  winProbability?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pushTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pushBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  branchIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];
}
