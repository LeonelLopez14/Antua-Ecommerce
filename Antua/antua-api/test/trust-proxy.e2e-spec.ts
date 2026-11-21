import './trust-proxy-env';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.setup';

describe('TRUST_PROXY=1 (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    // Ruta solo de este test: devuelve la IP que ve Express (la que usa el límite de intentos).
    app.use('/__ip', (req: Request, res: Response) => {
      res.json({ ip: req.ip });
    });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('toma la IP del cliente que agrega el proxy en X-Forwarded-For', async () => {
    const res = await request(app.getHttpServer())
      .get('/__ip')
      .set('X-Forwarded-For', '203.0.113.7')
      .expect(200);
    expect(res.body).toEqual({ ip: '203.0.113.7' });
  });

  it('con 1 proxy, ignora lo que el cliente haya escrito antes en el header', async () => {
    // El cliente manda "1.1.1.1" y Caddy agrega la IP real al final: vale solo el último salto.
    const res = await request(app.getHttpServer())
      .get('/__ip')
      .set('X-Forwarded-For', '1.1.1.1, 198.51.100.4')
      .expect(200);
    expect(res.body).toEqual({ ip: '198.51.100.4' });
  });
});
