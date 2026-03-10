import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  deviceId: string;

  @IsString()
  platform: string; // 'ios' | 'android'

  @IsString()
  @IsOptional()
  fcmToken?: string;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;

  @IsString()
  @IsOptional()
  deviceModel?: string;

  @IsString()
  @IsOptional()
  appVersion?: string;
}
