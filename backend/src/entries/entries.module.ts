import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EntriesService } from './entries.service';
import { EntriesController } from './entries.controller';

@Module({
  imports: [ConfigModule],
  providers: [EntriesService],
  controllers: [EntriesController],
})
export class EntriesModule {}
