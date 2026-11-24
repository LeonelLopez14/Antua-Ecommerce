import { parsePaymentsConfig } from './env.validation';

export type CheckLevel = 'ok' | 'aviso' | 'falta';

export interface CheckLine {
  level: CheckLevel;
  text: string;
}

const textOf = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

function publicHttps(raw: string): string | null {
  if (!URL.canParse(raw)) return 'no es una URL';
  const url = new URL(raw);
  if (url.protocol !== 'https:') return 'tiene que ser HTTPS';
  if (['localhost', '127.0.0.1', '::1'].includes(url.hostname))
    return 'no puede ser localhost (Mercado Pago no llega)';
  return null;
}

/**
 * Revisa la configuración de Mercado Pago SIN conectarse a nada: qué variables hay, si tienen un
 * formato razonable, en qué modo arrancaría la API y qué URL de webhook hay que cargar en el panel
 * de Mercado Pago. Es lo que imprime `pnpm payments:check`.
 */
export function checkPaymentsEnv(env: Record<string, unknown>): {
  lines: CheckLine[];
  ready: boolean;
} {
  const lines: CheckLine[] = [];
  const add = (level: CheckLevel, text: string) => lines.push({ level, text });

  // 1. La misma validación que hace la API al arrancar.
  let mode: 'disabled' | 'simulated' | 'mercadopago' | null = null;
  try {
    mode = parsePaymentsConfig(env).mode;
  } catch (error) {
    add(
      'falta',
      `La API no arrancaría: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (mode === 'disabled') {
    add(
      'aviso',
      'Pagos deshabilitados: faltan MP_ACCESS_TOKEN y MP_WEBHOOK_SECRET. El checkout registra el pedido y el pago se coordina aparte.',
    );
  } else if (mode === 'simulated') {
    add(
      'ok',
      'Modo simulado (PAYMENTS_SIMULATED=true): no sale nada a internet. Para Mercado Pago de prueba, sacá PAYMENTS_SIMULATED.',
    );
  } else if (mode === 'mercadopago') {
    add(
      'ok',
      'Modo Mercado Pago: la API arrancaría con las credenciales cargadas.',
    );
  }
  if (env.NODE_ENV === 'production') {
    add(
      'aviso',
      'NODE_ENV=production: la API nunca activa pagos en producción (proyecto de práctica).',
    );
  }

  // 2. Formato de cada variable (sin validar contra Mercado Pago: eso requiere conectarse).
  const token = textOf(env.MP_ACCESS_TOKEN);
  if (token) {
    if (/^(APP_USR|TEST)-[\w-]{20,}$/.test(token)) {
      add(
        'ok',
        `MP_ACCESS_TOKEN con formato esperado (${token.slice(0, 8)}…).`,
      );
    } else {
      add(
        'aviso',
        'MP_ACCESS_TOKEN no tiene el formato esperado (APP_USR-…). ¿Copiaste el Access Token completo?',
      );
    }
    add(
      'aviso',
      'Por el prefijo no se distingue prueba de producción (los dos empiezan con APP_USR-): copialo con el selector de la app en "Prueba".',
    );
  } else {
    add(
      'falta',
      'MP_ACCESS_TOKEN: vacío (Tus integraciones → tu app → Prueba → Credenciales).',
    );
  }

  const secret = textOf(env.MP_WEBHOOK_SECRET);
  if (!secret)
    add(
      'falta',
      'MP_WEBHOOK_SECRET: vacío (Tus integraciones → tu app → Webhooks → Configurar notificaciones → clave secreta).',
    );
  else if (secret.length < 16)
    add(
      'aviso',
      'MP_WEBHOOK_SECRET es muy corto: ¿es la clave secreta completa del webhook?',
    );
  else add('ok', 'MP_WEBHOOK_SECRET cargado.');

  const apiUrl = textOf(env.MP_PUBLIC_API_URL).replace(/\/+$/, '');
  const apiProblem = apiUrl ? publicHttps(apiUrl) : 'vacía';
  if (apiProblem) {
    add(
      'falta',
      `MP_PUBLIC_API_URL ${apiProblem}: es la URL pública (el túnel) de la API.`,
    );
  } else {
    add(
      'ok',
      `URL del webhook para cargar en Mercado Pago ("URL modo pruebas"): ${apiUrl}/payments/webhook`,
    );
  }

  const frontUrl = textOf(env.MP_PUBLIC_FRONTEND_URL).replace(/\/+$/, '');
  const frontProblem = frontUrl ? publicHttps(frontUrl) : 'vacía';
  if (frontProblem)
    add(
      'falta',
      `MP_PUBLIC_FRONTEND_URL ${frontProblem}: es la URL pública del front (los retornos /pago/…).`,
    );
  else
    add(
      'ok',
      `Retornos: ${frontUrl}/pago/exitoso, /pago/pendiente y /pago/fallido.`,
    );

  const currency = textOf(env.PAYMENT_CURRENCY) || 'UYU';
  if (currency === 'UYU') add('ok', 'Moneda UYU.');
  else add('aviso', `PAYMENT_CURRENCY=${currency}: la tienda trabaja en UYU.`);

  if (textOf(env.PAYMENTS_SIMULATED) === 'true' && token) {
    add(
      'falta',
      'PAYMENTS_SIMULATED=true y MP_ACCESS_TOKEN juntos: elegí uno.',
    );
  }

  return {
    lines,
    ready:
      mode === 'mercadopago' && !lines.some((line) => line.level === 'falta'),
  };
}
