import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionPlan } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

export interface PlanFeatures {
  campaigns: number;
  advancedCampaignTypes: boolean; // WEIGHTED_ODDS, SNAKE, POINT_GUESS
  duplication: boolean;
  financialAnalytics: boolean;
  eventLog: boolean;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanFeatures> = {
  FREE:       { campaigns: 3,        advancedCampaignTypes: false, duplication: false, financialAnalytics: false, eventLog: false },
  STARTER:    { campaigns: 10,       advancedCampaignTypes: true,  duplication: true,  financialAnalytics: true,  eventLog: false },
  GROWTH:     { campaigns: 20,       advancedCampaignTypes: true,  duplication: true,  financialAnalytics: true,  eventLog: true  },
  ENTERPRISE: { campaigns: Infinity, advancedCampaignTypes: true,  duplication: true,  financialAnalytics: true,  eventLog: true  },
};

const STRIPE_PRICE_MAP: Record<Exclude<SubscriptionPlan, 'FREE'>, string> = {
  STARTER: 'STRIPE_PRICE_STARTER',
  GROWTH: 'STRIPE_PRICE_GROWTH',
  ENTERPRISE: 'STRIPE_PRICE_ENTERPRISE',
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY') || 'sk_test_placeholder');
  }

  async getSubscription(businessId: string) {
    let sub = await this.prisma.subscription.findUnique({
      where: { businessId },
      include: { invoices: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });

    if (!sub) {
      sub = await this.prisma.subscription.create({
        data: { businessId },
        include: { invoices: { orderBy: { createdAt: 'desc' }, take: 20 } },
      });
    }

    return sub;
  }

  async changePlan(businessId: string, plan: SubscriptionPlan) {
    const sub = await this.getSubscription(businessId);

    // Downgrade to FREE → cancel existing subscription
    if (plan === SubscriptionPlan.FREE) {
      if (!sub.stripeSubscriptionId) {
        // Already on FREE, nothing to do
        return { redirect: false };
      }
      await this.stripe.subscriptions.cancel(sub.stripeSubscriptionId);
      await this.prisma.subscription.update({
        where: { businessId },
        data: {
          plan: SubscriptionPlan.FREE,
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
        },
      });
      return { redirect: false };
    }

    const priceEnvKey = STRIPE_PRICE_MAP[plan as Exclude<SubscriptionPlan, 'FREE'>];
    const priceId = this.config.get<string>(priceEnvKey);
    if (!priceId) {
      throw new BadRequestException(`Stripe price for ${plan} is not configured`);
    }

    // Already has a paid Stripe subscription → update it directly (upgrade or downgrade)
    if (sub.stripeSubscriptionId) {
      const stripeSub = await this.stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
      const currentItemId = (stripeSub.items as any).data[0]?.id;
      await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
        items: [{ id: currentItemId, price: priceId }],
        proration_behavior: 'create_prorations',
      });
      await this.prisma.subscription.update({
        where: { businessId },
        data: { plan },
      });
      return { redirect: false };
    }

    // No existing subscription → new Stripe Checkout session
    const customerId = await this.getOrCreateStripeCustomer(businessId, sub.stripeCustomerId);
    const panelUrl = this.config.get<string>('BUSINESS_PANEL_URL') ?? 'http://localhost:3001';
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${panelUrl}/billing?success=true`,
      cancel_url: `${panelUrl}/billing?cancelled=true`,
      metadata: { businessId, plan },
    });
    return { url: session.url, redirect: true };
  }

  async createPortalSession(businessId: string) {
    const sub = await this.getSubscription(businessId);
    if (!sub.stripeCustomerId) {
      throw new BadRequestException('No active subscription to manage');
    }

    const panelUrl = this.config.get<string>('BUSINESS_PANEL_URL') ?? 'http://localhost:3001';

    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${panelUrl}/billing`,
    });

    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    await this.processEvent(event);
    return { received: true };
  }

  private async processEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const businessId = session.metadata?.businessId;
        const plan = session.metadata?.plan as SubscriptionPlan;
        if (!businessId || !plan) break;

        await this.prisma.subscription.upsert({
          where: { businessId },
          create: {
            businessId,
            plan,
            isActive: true,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          },
          update: {
            plan,
            isActive: true,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const sub = await this.prisma.subscription.findFirst({
          where: { stripeSubscriptionId: stripeSub.id },
        });
        if (!sub) break;

        const planFromStripe = this.getPlanFromStripeSub(stripeSub);
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            plan: planFromStripe ?? sub.plan,
            isActive: stripeSub.status === 'active',
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const sub = await this.prisma.subscription.findFirst({
          where: { stripeSubscriptionId: stripeSub.id },
        });
        if (!sub) break;

        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            plan: SubscriptionPlan.FREE,
            isActive: true,
            stripeSubscriptionId: null,
            currentPeriodEnd: null,
          },
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const sub = await this.prisma.subscription.findFirst({
          where: { stripeCustomerId: invoice.customer as string },
        });
        if (!sub) break;

        await this.prisma.invoice.create({
          data: {
            subscriptionId: sub.id,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency.toUpperCase(),
            paidAt: invoice.status_transitions?.paid_at
              ? new Date((invoice.status_transitions.paid_at as number) * 1000)
              : null,
            invoiceUrl: (invoice as any).hosted_invoice_url ?? null,
          },
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const sub = await this.prisma.subscription.findFirst({
          where: { stripeCustomerId: invoice.customer as string },
        });
        if (!sub) break;

        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { isActive: false },
        });
        break;
      }

      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async getOrCreateStripeCustomer(businessId: string, existingCustomerId?: string | null): Promise<string> {
    if (existingCustomerId) return existingCustomerId;

    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Business not found');

    const customer = await this.stripe.customers.create({
      name: business.name,
      email: business.email ?? undefined,
      metadata: { businessId },
    });

    await this.prisma.subscription.update({
      where: { businessId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  private getPlanFromStripeSub(stripeSub: Stripe.Subscription): SubscriptionPlan | null {
    const priceId = (stripeSub.items as any)?.data?.[0]?.price?.id;
    if (!priceId) return null;

    for (const [plan, envKey] of Object.entries(STRIPE_PRICE_MAP)) {
      if (this.config.get<string>(envKey) === priceId) {
        return plan as SubscriptionPlan;
      }
    }
    return null;
  }
}
