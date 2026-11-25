import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import helmet from 'helmet';
import compression from 'compression';
import { static as serveStatic } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { TrustProxy } from './config/env.validation';
import { AllExceptionsFilter } from './observability/all-exceptions.filter';
import { requestIdMiddleware } from './observability/request-id.middleware';

/** Configuración global de la app. La comparten main.ts y los tests e2e. */
export function configureApp(app: INestApplication): void {
  // Detrás de Caddy: la IP real del cliente sale de X-Forwarded-For (ver parseTrustProxy).
  // Sin esto, el límite de intentos vería a todos los clientes con la IP del proxy.
  const trustProxy = app.get(ConfigService).get<TrustProxy>('TRUST_PROXY');
  if (trustProxy !== undefined && trustProxy !== false) {
    // La app siempre corre sobre Express (@nestjs/platform-express).
    (app as NestExpressApplication).set('trust proxy', trustProxy);
  }

  // Primero de todo: el id de la petición (cabecera X-Request-Id, logs y errores). Ver
  // src/observability/. En los tests no hay log de accesos: solo ensuciaría la salida.
  const nodeEnv = app.get(ConfigService).get<string>('NODE_ENV');
  app.use(requestIdMiddleware({ accessLog: nodeEnv !== 'test' }));
  app.useGlobalFilters(new AllExceptionsFilter(nodeEnv === 'production'));

  app.use(helmet());
  // gzip para respuestas de texto de más de 1 kB (JSON del catálogo, por ejemplo). Las imágenes ya
  // vienen comprimidas: compression las saltea por su Content-Type.
  app.use(compression({ threshold: 1024 }));

  // Solo los orígenes de CORS_ORIGINS. Vacío: sin CORS (en desarrollo, Vite hace de proxy).
  const origins = app.get(ConfigService).get<string[]>('CORS_ORIGINS') ?? [];
  if (origins.length > 0) {
    app.enableCors({
      origin: origins,
      exposedHeaders: ['X-Guest-Token', 'X-Request-Id'],
    });
  }

  // Imágenes subidas desde el panel. Solo archivos con nombre generado por el servidor
  // (ver src/admin/catalog/image-file.ts); sin listado de carpeta ni archivos ocultos.
  const uploadsDir = app.get(ConfigService).getOrThrow<string>('UPLOADS_DIR');
  app.use(
    '/uploads',
    serveStatic(uploadsDir, {
      index: false,
      dotfiles: 'deny',
      redirect: false,
      fallthrough: false,
      maxAge: '30d',
      immutable: true,
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        // Aunque alguien lograra subir un HTML, el navegador no ejecutaría nada.
        res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
        // Las imágenes las muestra el front, que en producción puede estar en otro origen.
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      // Un campo que el DTO no declara (por ejemplo `role` en el registro) se rechaza con 400 en vez
      // de ignorarse en silencio: la asignación masiva no pasa ni por error, y un cliente con un
      // nombre de campo equivocado se entera. El webhook de Mercado Pago no usa DTO: no le afecta.
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
}
