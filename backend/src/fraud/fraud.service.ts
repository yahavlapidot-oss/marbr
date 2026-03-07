import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FraudSeverity } from '@prisma/client';

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  constructor(private readonly prisma: PrismaService) {}

  async flag(userId: string | null, deviceId: string | null, reason: string, severity: FraudSeverity, metadata?: any) {
    return this.prisma.fraudFlag.create({ data: { userId, deviceId, reason, severity, metadata } });
  }

  async checkUser(userId: string): Promise<{ isSuspicious: boolean; flags: any[] }> {
    const flags = await this.prisma.fraudFlag.findMany({
      where: { userId, resolvedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const critical = flags.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH');
    return { isSuspicious: critical.length > 0, flags };
  }

  async detectDuplicateEntries(userId: string, campaignId: string): Promise<boolean> {
    const count = await this.prisma.entry.count({ where: { userId, campaignId } });
    if (count > 10) {
      await this.flag(userId, null, 'Excessive entry attempts', FraudSeverity.HIGH, { campaignId, count });
      return true;
    }
    return false;
  }

  async listFlags(resolved = false) {
    return this.prisma.fraudFlag.findMany({
      where: { resolvedAt: resolved ? { not: null } : null },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async resolve(id: string) {
    return this.prisma.fraudFlag.update({ where: { id }, data: { resolvedAt: new Date() } });
  }
}
