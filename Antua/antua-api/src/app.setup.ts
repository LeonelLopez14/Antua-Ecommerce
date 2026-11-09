import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import helmet from 'helmet';

/** Configuración global de la app. La comparten main.ts y los tests e2e. */
export function configureApp(app: INestApplication): void {
  app.use(helmet());

  // Solo los orígenes de CORS_ORIGINS. Vacío: sin CORS (en desarrollo, Vite hace de proxy).
  const origins = app.get(ConfigService).get<string[]>('CORS_ORIGINS') ?? [];
  if (origins.length > 0) {
    app.enableCors({ origin: origins, exposedHeaders: ['X-Guest-Token'] });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
}
