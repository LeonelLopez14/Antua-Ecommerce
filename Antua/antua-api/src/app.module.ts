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
import { AdminModule } from './admin/admin.module';
import { AdminAccessGuard } from './admin/admin-access.guard';

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
        // Las migraciones NO se aplican solas: se corren a mano con `pnpm migration:run`, después
        // de leerlas. Con migrationsRun: true, `pnpm dev` (en modo watch) aplicaba en segundos una
        // migración recién generada y sin revisar (así se vaciaron ingredientes y alérgenos en la Fase 12).
        migrationsRun: false,
        // Sin `true`: registrar cada query dejaría datos personales (emails, direcciones) en el log.
        logging: ['error', 'warn', 'migration'],
        // Si la base no responde al arrancar (por ejemplo, el contenedor todavía inicia), se
        // reintenta 10 veces cada 3 s ("Unable to connect to the database. Retrying…") y después
        // la API termina con el error. En Docker, `restart: unless-stopped` la vuelve a levantar.
        retryAttempts: 10,
        retryDelay: 3000,
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
    AdminModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    // Los guards globales corren en este orden: primero el límite de intentos, después el rol.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AdminAccessGuard },
  ],
})
export class AppModule {}
