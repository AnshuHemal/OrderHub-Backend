import { Module } from '@nestjs/common';
import { FloorsController } from './floors.controller';
import { FloorsService } from './floors.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports:     [EventsModule],
  controllers: [FloorsController],
  providers:   [FloorsService],
  exports:     [FloorsService],
})
export class FloorsModule {}
