import { Module } from '@nestjs/common';
import { join } from 'node:path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { TagsModule } from './tags/tags.module';
import { CartModule } from './cart/cart.module';
import { CouponsModule } from './coupons/coupons.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UsersModule } from './users/users.module';
import { AddressesModule } from './addresses/addresses.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { NewsletterModule } from './newsletter/newsletter.module';
import { HealthController } from './health/health.controller';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    // Límite general por IP; las rutas sensibles tienen uno propio con @Throttle.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 300 }],
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), // lee y valida el .env, disponible en toda la app

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        // MySQL guarda en UTC: sin esto, el driver leería las fechas como hora local y las correría.
        timezone: 'Z',
        autoLoadEntities: true, // toma automáticamente las entidades registradas via forFeature()
        // El esquema se gestiona con migraciones (src/database/migrations), no con synchronize:
        // synchronize puede borrar columnas sin avisar si una entidad cambia.
        synchronize: false,
        migrations: [join(__dirname, 'database', 'migrations', '*.{ts,js}')],
        migrationsRun: true, // aplica las pendientes al arrancar
        // Sin `true`: registrar cada query dejaría datos personales (emails, direcciones) en el log.
        logging: ['error', 'warn', 'migration'],
      }),
    }),

    ProductsModule,
    TagsModule,
    CartModule,
    CouponsModule,
    OrdersModule,
    PaymentsModule,
    ReviewsModule,
    UsersModule,
    AddressesModule,
    AuthModule,
    NewsletterModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
