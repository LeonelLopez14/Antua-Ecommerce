import { isAbsolute, relative, resolve } from 'node:path';

// Valida el .env al arrancar. Si algo falta o está mal, Nest no levanta y
// muestra el motivo, en vez de fallar más tarde con un total NaN.

export type PaymentsConfig = {
  currency: string;
  expirationHours: number;
  webhookSecret: string | null;
} & (
  | { mode: 'disabled' | 'simulated' }
  | {
      mode: 'mercadopago';
      accessToken: string;
      publicApiUrl: string;
      publicFrontendUrl: string;
    }
);

export interface ValidatedEnv extends Record<string, unknown> {
  SHIPPING_FLAT_RATE: number;
  SHIPPING_ETA_DAYS: number | null;
  FRONTEND_URL: string;
  CORS_ORIGINS: string[];
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  PAYMENTS: PaymentsConfig;
  UPLOADS_DIR: string;
  LOW_STOCK_THRESHOLD: number;
  TRUST_PROXY: TrustProxy;
}

/** `false`: no hay proxy. Un número: cuántos proxies hay delante. Una lista: IPs, redes o nombres de Express. */
export type TrustProxy = false | number | string[];

export function parseShippingFlatRate(raw: unknown): number {
  const text = typeof raw === 'string' ? raw.trim() : '';
  const amount = Number(text);

  if (text === '' || !Number.isFinite(amount) || amount < 0) {
    throw new Error(
      `SHIPPING_FLAT_RATE es obligatoria y tiene que ser un número mayor o igual a 0 (recibido: ${
        raw === undefined ? 'nada' : JSON.stringify(raw)
      }). Definila en antua-api/.env, por ejemplo: SHIPPING_FLAT_RATE=1500`,
    );
  }

  return amount;
}

/** Opcional: sin definir, no se muestra un plazo. Definida, tiene que ser un entero de 1 a 60. */
export function parseShippingEtaDays(raw: unknown): number | null {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (text === '') return null;
  const days = Number(text);

  if (!Number.isInteger(days) || days < 1 || days > 60) {
    throw new Error(
      `SHIPPING_ETA_DAYS tiene que ser un número entero de días, de 1 a 60 (recibido: ${JSON.stringify(raw)}). Dejala vacía si no querés mostrar un plazo.`,
    );
  }

  return days;
}

/** URL pública del front: arma los links de los mails. Por defecto, la de desarrollo. */
export function parseFrontendUrl(raw: unknown): string {
  const value =
    typeof raw === 'string' && raw.trim()
      ? raw.trim()
      : 'http://localhost:5173';
  if (!URL.canParse(value)) {
    throw new Error(`FRONTEND_URL no es una URL válida (recibido: ${value}).`);
  }
  return value.replace(/\/+$/, '');
}

/** Lista separada por comas. Nunca acepta `*`: las credenciales del front irían a cualquier sitio. */
export function parseCorsOrigins(raw: unknown): string[] {
  const list = (typeof raw === 'string' ? raw : '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of list) {
    if (origin.includes('*') || !URL.canParse(origin)) {
      throw new Error(
        `CORS_ORIGINS solo acepta orígenes completos, sin "*" (recibido: ${origin}).`,
      );
    }
  }
  return list;
}

export function parseJwtSecret(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length < 32) {
    throw new Error(
      'JWT_SECRET es obligatoria y tiene que tener al menos 32 caracteres.',
    );
  }
  return raw;
}

/** Todo JWT tiene que vencer: sin esto se emitirían tokens válidos para siempre. */
export function parseJwtExpiresIn(raw: unknown): string {
  if (typeof raw !== 'string' || !/^\d+[smhd]$/.test(raw.trim())) {
    throw new Error(
      `JWT_EXPIRES_IN es obligatoria, con formato como 7d o 12h (recibido: ${JSON.stringify(raw)}).`,
    );
  }
  return raw.trim();
}

const textOf = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/** Mercado Pago exige HTTPS y no acepta dominios locales en el webhook ni en los retornos. */
function parsePublicUrl(name: string, raw: unknown): string {
  const value = textOf(raw).replace(/\/+$/, '');
  const url = URL.canParse(value) ? new URL(value) : null;
  if (
    !url ||
    url.protocol !== 'https:' ||
    ['localhost', '127.0.0.1'].includes(url.hostname)
  ) {
    throw new Error(
      `${name} tiene que ser una URL pública HTTPS, sin localhost (recibido: "${value}"). Ver docs/payments-design.md.`,
    );
  }
  return value;
}

/**
 * Sin credenciales, Payments queda deshabilitado con un aviso. Con credenciales incompletas no
 * arranca, para que nadie crea que cobra. Y nunca arranca en producción: es un proyecto de práctica.
 */
export function parsePaymentsConfig(
  config: Record<string, unknown>,
): PaymentsConfig {
  const currency = textOf(config.PAYMENT_CURRENCY) || 'UYU';
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error(
      `PAYMENT_CURRENCY tiene que ser un código de 3 letras (recibido: ${currency}).`,
    );
  }
  const expirationText = textOf(config.PAYMENT_EXPIRATION_HOURS) || '48';
  const expirationHours = Number(expirationText);
  if (
    !Number.isInteger(expirationHours) ||
    expirationHours < 1 ||
    expirationHours > 720
  ) {
    throw new Error(
      `PAYMENT_EXPIRATION_HOURS tiene que ser un entero de 1 a 720 (recibido: ${expirationText}).`,
    );
  }

  const accessToken = textOf(config.MP_ACCESS_TOKEN);
  const secret = textOf(config.MP_WEBHOOK_SECRET);
  const simulated = textOf(config.PAYMENTS_SIMULATED) === 'true';
  const common = { currency, expirationHours };
  const enabled = simulated || accessToken !== '';

  if (enabled && config.NODE_ENV === 'production') {
    throw new Error(
      'Payments no puede usarse con NODE_ENV=production: este proyecto solo admite pagos de prueba.',
    );
  }
  if (simulated) {
    if (accessToken) {
      throw new Error(
        'PAYMENTS_SIMULATED=true no se puede combinar con MP_ACCESS_TOKEN.',
      );
    }
    if (!secret) {
      throw new Error('PAYMENTS_SIMULATED=true requiere MP_WEBHOOK_SECRET.');
    }
    return { ...common, mode: 'simulated', webhookSecret: secret };
  }
  if (!accessToken && !secret) {
    return { ...common, mode: 'disabled', webhookSecret: null };
  }
  if (!accessToken || !secret) {
    throw new Error(
      'Para activar los pagos hacen falta MP_ACCESS_TOKEN y MP_WEBHOOK_SECRET juntas.',
    );
  }
  return {
    ...common,
    mode: 'mercadopago',
    accessToken,
    webhookSecret: secret,
    publicApiUrl: parsePublicUrl('MP_PUBLIC_API_URL', config.MP_PUBLIC_API_URL),
    publicFrontendUrl: parsePublicUrl(
      'MP_PUBLIC_FRONTEND_URL',
      config.MP_PUBLIC_FRONTEND_URL,
    ),
  };
}

/**
 * Carpeta de las imágenes subidas desde el panel. Por defecto `uploads/` (relativa a donde corre
 * la API, en .gitignore). Nunca dentro de `src/`: una subida no puede pisar código.
 */
export function parseUploadsDir(raw: unknown, cwd = process.cwd()): string {
  const dir = resolve(cwd, textOf(raw) || 'uploads');
  const fromSrc = relative(resolve(cwd, 'src'), dir);
  if (fromSrc === '' || (!fromSrc.startsWith('..') && !isAbsolute(fromSrc))) {
    throw new Error(
      `UPLOADS_DIR no puede estar dentro de src/ (recibido: ${dir}).`,
    );
  }
  return dir;
}

/** Variantes con este stock o menos se marcan como "stock bajo" en el panel. Por defecto 5. */
export function parseLowStockThreshold(raw: unknown): number {
  const text = textOf(raw) || '5';
  const value = Number(text);
  if (!Number.isInteger(value) || value < 0 || value > 10_000) {
    throw new Error(
      `LOW_STOCK_THRESHOLD tiene que ser un entero de 0 a 10000 (recibido: ${text}).`,
    );
  }
  return value;
}

/**
 * Detrás de un proxy (Caddy), todas las requests llegan desde la IP del proxy. Sin `trust proxy`,
 * el límite de intentos contaría a todos los clientes como uno solo. Con `trust proxy`, Express
 * toma la IP del cliente del header X-Forwarded-For que agrega el proxy.
 *
 * Nunca `true`: confiaría en cualquier X-Forwarded-For, y cualquiera podría inventarse una IP
 * nueva en cada intento para saltear el límite.
 */
export function parseTrustProxy(raw: unknown): TrustProxy {
  const text = textOf(raw);
  if (text === '' || text === 'false') return false;
  if (/^\d+$/.test(text)) {
    const hops = Number(text);
    if (hops >= 1 && hops <= 5) return hops;
  } else if (text !== 'true') {
    const list = text
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const named = ['loopback', 'linklocal', 'uniquelocal'];
    const ipOrCidr = /^[\d.]+(\/\d{1,2})?$|^[\da-f:]+(\/\d{1,3})?$/i;
    if (list.every((item) => named.includes(item) || ipOrCidr.test(item))) {
      return list;
    }
  }
  throw new Error(
    `TRUST_PROXY tiene que ser false, la cantidad de proxies delante de la API (1 a 5) o una lista de IPs/redes (recibido: ${JSON.stringify(raw)}). Nunca "true".`,
  );
}

/** Fragmentos que delatan un valor copiado de un .env de ejemplo. */
const EXAMPLE_MARKERS = [
  'reemplazar',
  'ejemplo',
  'example',
  'changeme',
  'cambiame',
  'placeholder',
  'tu_password',
  'password',
  'secreto',
];

/** Rechaza secretos vacíos, cortos, de ejemplo o repetitivos ("aaaa…"). */
function assertStrongSecret(
  name: string,
  raw: unknown,
  minLength: number,
): void {
  const value = textOf(raw);
  const lower = value.toLowerCase();
  const weak =
    value.length < minLength ||
    EXAMPLE_MARKERS.some((marker) => lower.includes(marker)) ||
    new Set(value).size < Math.min(12, Math.floor(minLength / 2));
  if (weak) {
    throw new Error(
      `${name} es débil o de ejemplo: en producción tiene que ser aleatoria, de ${minLength} caracteres o más. Generala con scripts/generate-secrets.sh.`,
    );
  }
}

/**
 * Reglas extra con NODE_ENV=production. En desarrollo no se aplican, para no romper los .env
 * locales; en producción un secreto de ejemplo es una puerta abierta.
 */
export function assertProductionEnv(config: Record<string, unknown>): void {
  if (config.NODE_ENV !== 'production') return;

  const missing = [
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
    'FRONTEND_URL',
  ].filter((name) => textOf(config[name]) === '');
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables obligatorias en producción: ${missing.join(', ')}. Ver .env.prod.example.`,
    );
  }
  const port = Number(textOf(config.DB_PORT));
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(
      `DB_PORT no es un puerto válido (recibido: ${textOf(config.DB_PORT)}).`,
    );
  }
  if (textOf(config.DB_USERNAME).toLowerCase() === 'root') {
    throw new Error(
      'En producción la API no se conecta como root: usá el usuario de aplicación (DB_USERNAME=antua_app), que solo lee y escribe datos.',
    );
  }
  assertStrongSecret('JWT_SECRET', config.JWT_SECRET, 32);
  assertStrongSecret('DB_PASSWORD', config.DB_PASSWORD, 16);
  if (new URL(parseFrontendUrl(config.FRONTEND_URL)).protocol !== 'https:') {
    throw new Error(
      'En producción FRONTEND_URL tiene que ser HTTPS (los links de los mails apuntan ahí).',
    );
  }
  if (textOf(config.SEED_ADMIN_PASSWORD) !== '') {
    throw new Error(
      'SEED_ADMIN_PASSWORD es solo para desarrollo: borrala en producción. El primer admin se crea con admin:create.',
    );
  }
}

export function validateEnv(config: Record<string, unknown>): ValidatedEnv {
  assertProductionEnv(config);
  return {
    ...config,
    SHIPPING_FLAT_RATE: parseShippingFlatRate(config.SHIPPING_FLAT_RATE),
    SHIPPING_ETA_DAYS: parseShippingEtaDays(config.SHIPPING_ETA_DAYS),
    FRONTEND_URL: parseFrontendUrl(config.FRONTEND_URL),
    CORS_ORIGINS: parseCorsOrigins(config.CORS_ORIGINS),
    JWT_SECRET: parseJwtSecret(config.JWT_SECRET),
    JWT_EXPIRES_IN: parseJwtExpiresIn(config.JWT_EXPIRES_IN),
    PAYMENTS: parsePaymentsConfig(config),
    UPLOADS_DIR: parseUploadsDir(config.UPLOADS_DIR),
    LOW_STOCK_THRESHOLD: parseLowStockThreshold(config.LOW_STOCK_THRESHOLD),
    TRUST_PROXY: parseTrustProxy(config.TRUST_PROXY),
  };
}
