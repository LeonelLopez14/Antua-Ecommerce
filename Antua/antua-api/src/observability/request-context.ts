import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

/**
 * Identificador de la petición en curso. Lo pone request-id.middleware.ts y lo leen el logger y el
 * filtro de errores, sin pasarlo de función en función (AsyncLocalStorage sigue a las promesas).
 */
const storage = new AsyncLocalStorage<{ requestId: string }>();

export const REQUEST_ID_HEADER = 'X-Request-Id';

/**
 * Se acepta el id que manda quien llama (un proxy, un monitor o Mercado Pago, que firma su webhook
 * con su propio x-request-id) solo si es corto y sin caracteres raros: así no se puede inyectar
 * saltos de línea ni basura en los logs. Si no, se genera uno.
 */
const VALID_REQUEST_ID = /^[A-Za-z0-9._:-]{8,100}$/;

export function resolveRequestId(incoming: unknown): string {
  return typeof incoming === 'string' && VALID_REQUEST_ID.test(incoming)
    ? incoming
    : randomUUID();
}

export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return storage.run({ requestId }, fn);
}

export function currentRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}
