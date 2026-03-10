import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const PLAN_ORDER: SubscriptionPlan[] = [
  SubscriptionPlan.FREE,
  SubscriptionPlan.STARTER,
  SubscriptionPlan.GROWTH,
  SubscriptionPlan.ENTERPRISE,
];

export const REQUIRED_PLAN_KEY = 'requiredPlan';
export const RequiresPlan = (plan: SubscriptionPlan) =>
  SetMetadata(REQUIRED_PLAN_KEY, plan);

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<SubscriptionPlan>(REQUIRED_PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPlan) return true;

    const { user } = context.switchToHttp().getRequest();
    const businessId: string | undefined = user?.businessId;
    if (!businessId) return true;

    const sub = await this.prisma.subscription.findUnique({ where: { businessId } });
    const currentPlan = sub?.plan ?? SubscriptionPlan.FREE;

    const currentIndex = PLAN_ORDER.indexOf(currentPlan);
    const requiredIndex = PLAN_ORDER.indexOf(requiredPlan);

    if (currentIndex < requiredIndex) {
      throw new ForbiddenException({
        message: `This feature requires the ${requiredPlan} plan or higher`,
        requiredPlan,
        currentPlan,
      });
    }

    return true;
  }
}
