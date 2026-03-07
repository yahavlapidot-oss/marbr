import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class RedeemDto {
  @ApiProperty({ description: 'UserReward redemption code or ID' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Branch where redemption is happening' })
  @IsString()
  branchId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
