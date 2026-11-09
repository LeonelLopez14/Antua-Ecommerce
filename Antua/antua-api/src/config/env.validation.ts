// Valida el .env al arrancar. Si algo falta o está mal, Nest no levanta y
// muestra el motivo, en vez de fallar más tarde con un total NaN.

export interface ValidatedEnv extends Record<string, unknown> {
  SHIPPING_FLAT_RATE: number;
  SHIPPING_ETA_DAYS: number | null;
  FRONTEND_URL: string;
  CORS_ORIGINS: string[];
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
}

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

export function validateEnv(config: Record<string, unknown>): ValidatedEnv {
  return {
    ...config,
    SHIPPING_FLAT_RATE: parseShippingFlatRate(config.SHIPPING_FLAT_RATE),
    SHIPPING_ETA_DAYS: parseShippingEtaDays(config.SHIPPING_ETA_DAYS),
    FRONTEND_URL: parseFrontendUrl(config.FRONTEND_URL),
    CORS_ORIGINS: parseCorsOrigins(config.CORS_ORIGINS),
    JWT_SECRET: parseJwtSecret(config.JWT_SECRET),
    JWT_EXPIRES_IN: parseJwtExpiresIn(config.JWT_EXPIRES_IN),
  };
}
