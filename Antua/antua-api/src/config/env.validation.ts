// Valida el .env al arrancar. Si algo falta o está mal, Nest no levanta y
// muestra el motivo, en vez de fallar más tarde con un total NaN.

export interface ValidatedEnv extends Record<string, unknown> {
  SHIPPING_FLAT_RATE: number;
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

export function validateEnv(config: Record<string, unknown>): ValidatedEnv {
  return {
    ...config,
    SHIPPING_FLAT_RATE: parseShippingFlatRate(config.SHIPPING_FLAT_RATE),
  };
}
