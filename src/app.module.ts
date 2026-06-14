import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { PrismaModule }     from './prisma/prisma.module';
import { AuthModule }       from './auth/auth.module';
import { UsersModule }      from './users/users.module';
import { FloorsModule }     from './floors/floors.module';
import { MenuModule }       from './menu/menu.module';
import { OrdersModule }     from './orders/orders.module';
import { AnalyticsModule }  from './analytics/analytics.module';
import { CustomersModule }  from './customers/customers.module';
import { CouponsModule }    from './coupons/coupons.module';
import { PromotionsModule } from './promotions/promotions.module';
import { EmailsModule }     from './emails/emails.module';
import { EventsModule }     from './events/events.module';
import { SettingsModule }   from './settings/settings.module';
import { BookingsModule }   from './bookings/bookings.module';
import { IngredientsModule } from './ingredients/ingredients.module';

import { JwtAuthGuard }         from './common/guards/jwt-auth.guard';
import { RolesGuard }           from './common/guards/roles.guard';
import { ResponseInterceptor }  from './common/interceptors/response.interceptor';

import { AppController } from './app.controller';
import { AppService }    from './app.service';

@Module({
  imports: [
    // Config — available globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting — 120 requests / 60 s per IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),

    // Core
    PrismaModule,
    AuthModule,
    UsersModule,
    FloorsModule,
    MenuModule,
    OrdersModule,
    AnalyticsModule,
    CustomersModule,
    CouponsModule,
    PromotionsModule,
    EmailsModule,
    EventsModule,
    SettingsModule,
    BookingsModule,
    IngredientsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Apply JWT guard globally — mark public routes with @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Wrap every response in { success, data, timestamp }
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
