import { Module } from '@nestjs/common';
import { RedemptionsService } from './redemptions.service';
import { RedemptionsController } from './redemptions.controller';

@Module({
  providers: [RedemptionsService],
  controllers: [RedemptionsController]
})
export class RedemptionsModule {}
