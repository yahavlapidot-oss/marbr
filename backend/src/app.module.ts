import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BusinessesModule } from './businesses/businesses.module';
import { BranchesModule } from './branches/branches.module';
import { EmployeesModule } from './employees/employees.module';
import { ProductsModule } from './products/products.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { EntriesModule } from './entries/entries.module';
import { RewardsModule } from './rewards/rewards.module';
import { RedemptionsModule } from './redemptions/redemptions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BillingModule } from './billing/billing.module';
import { FraudModule } from './fraud/fraud.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    BusinessesModule,
    BranchesModule,
    EmployeesModule,
    ProductsModule,
    CampaignsModule,
    EntriesModule,
    RewardsModule,
    RedemptionsModule,
    NotificationsModule,
    AnalyticsModule,
    BillingModule,
    FraudModule,
    AdminModule,
  ],
})
export class AppModule {}
