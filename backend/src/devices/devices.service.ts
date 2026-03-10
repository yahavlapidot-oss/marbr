import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, dto: RegisterDeviceDto) {
    return this.prisma.userDevice.upsert({
      where: { userId_deviceId: { userId, deviceId: dto.deviceId } },
      create: {
        userId,
        deviceId: dto.deviceId,
        platform: dto.platform,
        fcmToken: dto.fcmToken,
        deviceModel: dto.deviceModel,
        appVersion: dto.appVersion,
        lastLat: dto.lat,
        lastLng: dto.lng,
        lastSeenAt: new Date(),
      },
      update: {
        fcmToken: dto.fcmToken,
        lastLat: dto.lat,
        lastLng: dto.lng,
        deviceModel: dto.deviceModel,
        appVersion: dto.appVersion,
        lastSeenAt: new Date(),
      },
    });
  }
}
