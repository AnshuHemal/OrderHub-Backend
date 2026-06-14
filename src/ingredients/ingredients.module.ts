import { Module } from '@nestjs/common';
import { IngredientsService } from './ingredients.service';
import { IngredientsController } from './ingredients.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports:     [EventsModule],
  controllers: [IngredientsController],
  providers:   [IngredientsService],
  exports:     [IngredientsService],
})
export class IngredientsModule {}
