import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter, GENERIC_ERROR } from './all-exceptions.filter';
import { AppLogger } from './app-logger';
import { redact, REDACTED, redactText } from './redact';
import {
  currentRequestId,
  resolveRequestId,
  runWithRequestId,
} from './request-context';

describe('redacción', () => {
  it('oculta emails completos, JWT, Bearer y claves dentro de un texto', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjF9.abcdefghijklmnopqrstuvwxyz012345';
    const text = redactText(
      `login de ana.perez@antojarte.example con Bearer ${jwt} token=abc123 password: hunter2`,
    );
    expect(text).toContain('a***@antojarte.example');
    expect(text).not.toContain('ana.perez');
    expect(text).not.toContain(jwt);
    expect(text).not.toContain('abc123');
    expect(text).not.toContain('hunter2');
  });

  it('borra campos sensibles aunque vengan anidados, y no toca el resto', () => {
    const clean = redact({
      user: { email: 'bea@antojarte.example', password: 'x', id: 7 },
      headers: { authorization: 'Bearer abc', 'x-guest-token': 'uuid' },
      order: { id: 3, guest_access_token_hash: 'f'.repeat(64) },
      list: [{ secret: 1 }],
    });
    expect(clean).toEqual({
      user: { email: 'b***@antojarte.example', password: REDACTED, id: 7 },
      headers: { authorization: REDACTED, 'x-guest-token': REDACTED },
      order: { id: 3, guest_access_token_hash: REDACTED },
      list: [{ secret: REDACTED }],
    });
  });

  it('de un Error deja nombre y mensaje redactado', () => {
    expect(redact(new Error('falló para ana@antojarte.example'))).toEqual({
      name: 'Error',
      message: 'falló para a***@antojarte.example',
    });
  });
});

describe('id de la petición', () => {
  it('acepta un id razonable de afuera y genera uno si no hay o es raro', () => {
    expect(resolveRequestId('caddy-1234abcd')).toBe('caddy-1234abcd');
    for (const bad of [
      undefined,
      '',
      'corto',
      'con\nsalto-de-linea',
      'x'.repeat(101),
      ['a'],
    ])
      expect(resolveRequestId(bad)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('se ve desde código asíncrono dentro de la petición', async () => {
    await runWithRequestId('req-12345678', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      expect(currentRequestId()).toBe('req-12345678');
    });
    expect(currentRequestId()).toBeUndefined();
  });
});

describe('logger JSON', () => {
  const capture = () => {
    const lines: { line: string; stderr: boolean }[] = [];
    const logger = new AppLogger(true, (line, stderr) =>
      lines.push({ line, stderr }),
    );
    const entries = () =>
      lines.map((l) => JSON.parse(l.line) as Record<string, unknown>);
    return { logger, lines, entries };
  };

  it('escribe una línea JSON con nivel, contexto e id de la petición', () => {
    const { logger, entries, lines } = capture();
    runWithRequestId('req-abcdefgh', () =>
      logger.log('pedido creado', 'Orders'),
    );
    expect(entries()[0]).toMatchObject({
      level: 'log',
      context: 'Orders',
      requestId: 'req-abcdefgh',
      msg: 'pedido creado',
    });
    expect(typeof entries()[0].time).toBe('string');
    expect(lines[0].stderr).toBe(false);
  });

  it('los errores van a stderr con el stack, y todo pasa por la redacción', () => {
    const { logger, entries, lines } = capture();
    const error = new Error('no se pudo mandar a ana@antojarte.example');
    logger.error(error, 'Mail');
    logger.log({
      msg: 'login',
      body: { email: 'ana@antojarte.example', password: 'x' },
    });
    const [first, second] = entries();
    expect(lines[0].stderr).toBe(true);
    expect(first).toMatchObject({
      level: 'error',
      context: 'Mail',
      message: 'no se pudo mandar a a***@antojarte.example',
    });
    expect(String(first.stack)).toContain('at ');
    expect(JSON.stringify(entries())).not.toContain('ana@');
    expect(second.body).toEqual({
      email: 'a***@antojarte.example',
      password: REDACTED,
    });
  });
});

describe('filtro global de errores', () => {
  const run = (exception: unknown, production: boolean) => {
    interface FakeResponse {
      statusCode: number;
      body: unknown;
      status: (code: number) => FakeResponse;
      json: (body: unknown) => FakeResponse;
    }
    const res: FakeResponse = {
      statusCode: 0,
      body: undefined,
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (body) => {
        res.body = body;
        return res;
      },
    };
    const host = {
      switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({}) }),
    } as unknown as ArgumentsHost;
    const filter = new AllExceptionsFilter(production);
    // Los 500 se loguean: acá no interesa la salida.
    jest
      .spyOn(
        (filter as unknown as { logger: { error: () => void } }).logger,
        'error',
      )
      .mockImplementation(() => undefined);
    runWithRequestId('req-00000001', () => filter.catch(exception, host));
    return res;
  };

  it('en producción, un error inesperado da 500 genérico con el id, sin detalle ni stack', () => {
    const res = run(
      Object.assign(
        new Error("ER_NO_SUCH_TABLE: Table 'antua_db.orders' doesn't exist"),
        {
          stack: 'Error\n    at /app/dist/orders/orders.service.js:10:5',
        },
      ),
      true,
    );
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      statusCode: 500,
      message: GENERIC_ERROR,
      requestId: 'req-00000001',
    });
    expect(JSON.stringify(res.body)).not.toMatch(/ER_|antua_db|\/app\/|at /);
  });

  it('fuera de producción suma el mensaje en `detail`, para depurar', () => {
    const res = run(new Error('algo raro'), false);
    expect(res.body).toMatchObject({ statusCode: 500, detail: 'algo raro' });
  });

  it('las HttpException conservan su cuerpo y suman el id', () => {
    expect(
      run(new NotFoundException('Pedido no encontrado.'), true).body,
    ).toEqual({
      statusCode: 404,
      message: 'Pedido no encontrado.',
      error: 'Not Found',
      requestId: 'req-00000001',
    });
    const validation = run(
      new BadRequestException(['email must be an email']),
      true,
    );
    expect(validation.statusCode).toBe(400);
    expect(validation.body).toMatchObject({
      message: ['email must be an email'],
    });
    expect(
      run(new ServiceUnavailableException({ status: 'error' }), true).body,
    ).toEqual({
      status: 'error',
      requestId: 'req-00000001',
    });
  });

  it('los errores de Express (JSON roto, cuerpo enorme) dan su 4xx con un mensaje propio', () => {
    const tooLarge = run(
      Object.assign(new Error('request entity too large'), {
        status: 413,
        expose: true,
      }),
      true,
    );
    expect(tooLarge.statusCode).toBe(413);
    expect(tooLarge.body).toEqual({
      statusCode: 413,
      message: 'El pedido es demasiado grande.',
      requestId: 'req-00000001',
    });
    const broken = run(
      Object.assign(new SyntaxError('Unexpected end of JSON input'), {
        status: 400,
        expose: true,
      }),
      true,
    );
    expect(broken.body).toMatchObject({
      statusCode: 400,
      message: 'El cuerpo del pedido no es válido.',
    });
  });
});
