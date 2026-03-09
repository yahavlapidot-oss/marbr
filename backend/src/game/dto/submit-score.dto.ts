import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class SubmitScoreDto {
  @ApiProperty() @IsString() gameToken: string;
  @ApiProperty() @IsInt() @Min(0) score: number;
  @ApiProperty() @IsInt() @Min(0) foodEaten: number;
  @ApiProperty() @IsInt() @Min(0) durationMs: number;
}
