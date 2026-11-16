import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  // Las migraciones no se aplican solas (ver app.module.ts): solo se avisa si falta alguna.
  if (await app.get(DataSource).showMigrations()) {
    new Logger('Migraciones').warn(
      'Hay migraciones pendientes. Leelas en src/database/migrations y aplicalas con `pnpm migration:run`.',
    );
  }
  await app.listen(3000);
}

void bootstrap();
