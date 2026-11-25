import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { configureApp } from './app.setup';
import { createAppLogger } from './observability/app-logger';

async function bootstrap() {
  // bufferLogs: los mensajes del arranque esperan al logger propio (JSON en producción, con redacción).
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(createAppLogger());
  configureApp(app);
  // Las migraciones no se aplican solas (ver app.module.ts): solo se avisa si falta alguna.
  const logger = new Logger('Migraciones');
  try {
    if (await app.get(DataSource).showMigrations()) {
      logger.warn(
        'Hay migraciones pendientes. Leelas en src/database/migrations y aplicalas con `pnpm migration:run` (en Docker: el servicio `migrate`).',
      );
    }
  } catch (error) {
    // En producción la API usa un usuario que no puede crear tablas: si nunca se migró, ni
    // siquiera existe la tabla `migrations`. Se explica qué hacer en vez de un error de SQL suelto.
    logger.error(
      `No se pudo comprobar el estado de las migraciones (${error instanceof Error ? error.message : String(error)}). Si es una base nueva, aplicá las migraciones primero: docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm migrate`,
    );
    throw error;
  }
  // PORT es opcional (por ejemplo, para levantar una segunda copia en desarrollo). En Docker y en
  // producción es siempre 3000: lo esperan el healthcheck y Caddy.
  await app.listen(Number(process.env.PORT) || 3000);
}

void bootstrap();
