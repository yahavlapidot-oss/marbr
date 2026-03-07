import { Module } from '@nestjs/common';
import { FraudService } from './fraud.service';
import { FraudController } from './fraud.controller';

@Module({
  providers: [FraudService],
  controllers: [FraudController]
})
export class FraudModule {}
