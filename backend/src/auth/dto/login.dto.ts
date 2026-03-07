import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}

export class SendOtpDto {
  @ApiProperty({ description: 'Phone number or email to send OTP to' })
  @IsString()
  target: string;
}

export class VerifyOtpDto {
  @ApiProperty()
  @IsString()
  target: string;

  @ApiProperty()
  @IsString()
  code: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
