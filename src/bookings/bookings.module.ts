import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports:     [EventsModule],
  controllers: [BookingsController],
  providers:   [BookingsService],
  exports:     [BookingsService],
})
export class BookingsModule {}
