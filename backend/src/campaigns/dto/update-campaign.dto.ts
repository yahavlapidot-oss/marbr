import { IsOptional, IsString, IsInt, IsNumber, Min, Max } from 'class-validator';

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  startsAt?: string; // ISO string or empty string to clear

  @IsOptional()
  @IsString()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  everyN?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  winProbability?: number;

  @IsOptional()
  @IsString()
  pushTitle?: string;

  @IsOptional()
  @IsString()
  pushBody?: string;

  @IsOptional()
  @IsNumber()
  budget?: number;
}
