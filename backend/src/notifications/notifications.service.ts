import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationChannel } from '@prisma/client';
import { SendPushDto } from './dto/send-push.dto';

export { SendPushDto };

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async sendPush(dto: SendPushDto) {
    // Persist notification records
    await this.prisma.notification.createMany({
      data: dto.userIds.map((userId) => ({
        userId,
        title: dto.title,
        body: dto.body,
        data: dto.data ?? {},
        channel: NotificationChannel.PUSH,
      })),
    });

    // Get FCM tokens for users
    const devices = await this.prisma.userDevice.findMany({
      where: { userId: { in: dto.userIds }, fcmToken: { not: null } },
      select: { fcmToken: true },
    });

    const tokens = devices.map((d) => d.fcmToken).filter(Boolean) as string[];

    if (tokens.length === 0) {
      this.logger.warn('No FCM tokens found for target users');
      return { sent: 0 };
    }

    // Firebase Admin SDK integration (configured when FIREBASE_PROJECT_ID is set)
    const projectId = this.config.get('FIREBASE_PROJECT_ID');
    if (!projectId) {
      this.logger.warn('Firebase not configured — push notification skipped');
      return { sent: 0, tokens };
    }

    try {
      // Dynamic import so app starts without Firebase when not configured
      const admin = await import('firebase-admin');
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail: this.config.get('FIREBASE_CLIENT_EMAIL'),
            privateKey: this.config.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
          }),
        });
      }

      const response = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title: dto.title, body: dto.body },
        data: dto.data,
      });

      return { sent: response.successCount, failed: response.failureCount };
    } catch (err) {
      this.logger.error('Firebase push failed', err);
      return { sent: 0, error: String(err) };
    }
  }

  async sendCampaignNotification(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { business: true },
    });
    if (!campaign?.pushTitle) return;

    // Get users who favorited the business
    const favorites = await this.prisma.favoriteBusiness.findMany({
      where: { businessId: campaign.businessId },
      select: { userId: true },
    });

    const userIds = favorites.map((f) => f.userId);
    if (!userIds.length) return;

    return this.sendPush({
      userIds,
      title: campaign.pushTitle,
      body: campaign.pushBody ?? '',
      data: { campaignId, businessName: campaign.business.name },
    });
  }

  async markRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }
}
