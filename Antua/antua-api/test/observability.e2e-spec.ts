import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.setup';
import { GENERIC_ERROR } from 'src/observability/all-exceptions.filter';

/** Ruta solo de este test: falla como fallaría una consulta a la base. */
@Controller('__falla')
class FailingController {
  @Get()
  fail() {
    throw new Error(
      "ER_NO_SUCH_TABLE: Table 'antua_test.no_existe' doesn't exist",
    );
  }
}

/**
 * Id de la petición, errores y salud, de punta a punta. Qué pasa en producción (sin `detail`) y
 * cómo se redactan los logs: src/observability/observability.spec.ts.
 */
describe('observabilidad', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [FailingController],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(() => app.close());

  const server = () => app.getHttpServer();

  it('cada respuesta lleva X-Request-Id; uno válido de afuera se respeta, uno raro no', async () => {
    const generated = await request(server()).get('/health/live').expect(200);
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);

    const given = await request(server())
      .get('/health/live')
      .set('X-Request-Id', 'monitor-20261124-0001')
      .expect(200);
    expect(given.headers['x-request-id']).toBe('monitor-20261124-0001');

    const weird = await request(server())
      .get('/health/live')
      .set('X-Request-Id', '<script>')
      .expect(200);
    expect(weird.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('los errores llevan el mismo id que la cabecera', async () => {
    const res = await request(server()).get('/no-existe').expect(404);
    expect((res.body as { requestId: string }).requestId).toBe(
      res.headers['x-request-id'],
    );
  });

  it('un error inesperado da 500 con mensaje genérico: ni SQL, ni stack, ni rutas', async () => {
    const res = await request(server()).get('/__falla').expect(500);
    const body = res.body as Record<string, unknown>;
    expect(body.message).toBe(GENERIC_ERROR);
    expect(body.requestId).toBe(res.headers['x-request-id']);
    expect(JSON.stringify(body)).not.toMatch(
      /\bat \/|\.ts:|\.js:|node_modules/,
    );
    // Fuera de producción, `detail` ayuda a depurar; en producción no está (test unitario).
    expect(body.detail).toContain('ER_NO_SUCH_TABLE');
  });

  it('JSON roto y cuerpo enorme: 4xx con su id, sin stack ni rutas', async () => {
    // Nest lo convierte en un 400 con el texto del parser ("Unexpected end of JSON input"): no
    // dice nada interno, así que se deja.
    const broken = await request(server())
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ')
      .expect(400);
    expect((broken.body as { requestId: string }).requestId).toBe(
      broken.headers['x-request-id'],
    );
    expect(JSON.stringify(broken.body)).not.toMatch(/\bat |node_modules/);
    const big = await request(server())
      .post('/auth/login')
      .send({ email: 'a'.repeat(200_000) })
      .expect(413);
    expect((big.body as { message: string }).message).toBe(
      'El pedido es demasiado grande.',
    );
  });

  it('/health/live no toca la base; /health/ready y /health sí, sin datos internos', async () => {
    expect(
      (await request(server()).get('/health/live').expect(200)).body,
    ).toEqual({
      status: 'ok',
    });
    for (const path of ['/health/ready', '/health']) {
      const res = await request(server()).get(path).expect(200);
      expect(res.body).toEqual({ status: 'ok', database: 'up' });
    }
  });
});
