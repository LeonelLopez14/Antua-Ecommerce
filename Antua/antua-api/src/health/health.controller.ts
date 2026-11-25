import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';

/** Si la base no contesta en este tiempo, la API no está lista (un monitor no debe quedar colgado). */
const DATABASE_TIMEOUT_MS = 2000;

/**
 * Salud de la API, para Docker, Caddy y monitores externos (scripts/check-health.sh):
 *
 * - GET /health/live: el proceso está vivo y atiende. No toca la base: si la base se cae, la API
 *   no tiene que reiniciarse, solo dejar de estar "lista".
 * - GET /health/ready: además, la base responde. 503 si no.
 * - GET /health: igual que /ready (lo usan el healthcheck de Docker y los scripts de antes).
 *
 * No devuelven versiones, nombres de host ni mensajes de error: solo "ok" o "error".
 */
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  ready() {
    return this.check();
  }

  @Get()
  async check() {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.dataSource.query('SELECT 1'),
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('timeout')),
            DATABASE_TIMEOUT_MS,
          );
        }),
      ]);
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
