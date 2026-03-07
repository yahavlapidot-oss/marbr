import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { EntryMethod } from '@prisma/client';

export class ScanEntryDto {
  @ApiProperty()
  @IsString()
  campaignId: string;

  @ApiProperty({ enum: EntryMethod })
  @IsEnum(EntryMethod)
  method: EntryMethod;

  @ApiPropertyOptional({ description: 'QR code value or manual code' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purchaseRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lng?: number;
}
