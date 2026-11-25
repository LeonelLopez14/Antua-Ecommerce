/**
 * Redacción de datos personales y secretos antes de escribir un log. Se aplica a todo lo que pasa
 * por el logger (mensajes, objetos y stacks), así un `logger.error(error)` descuidado tampoco filtra.
 */

export const REDACTED = '[redactado]';

/** Campos cuyo valor nunca se escribe, aunque vengan anidados. */
const SENSITIVE_KEY =
  /pass(word)?|token|secret|authorization|cookie|signature|api[-_]?key|hash|credential|card|cvv/i;

const EMAIL =
  /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const JWT = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g;
const BEARER = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi;
/** `token=…`, `password: …`, `"secret":"…"` dentro de un texto. */
const KEY_VALUE =
  /\b((?:[\w-]*(?:pass(?:word)?|token|secret|signature|api[-_]?key))["']?\s*[:=]\s*["']?)[^\s"'&,;}]+/gi;

/** "ana.perez@antojarte.example" → "a***@antojarte.example": se ve el dominio, no la persona. */
export function redactText(text: string): string {
  return text
    .replace(JWT, '[jwt redactado]')
    .replace(BEARER, `$1 ${REDACTED}`)
    .replace(KEY_VALUE, `$1${REDACTED}`)
    .replace(EMAIL, '$1***@$2');
}

export function redact(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return redactText(value);
  if (value === null || typeof value !== 'object') return value;
  if (depth > 6) return '[…]';
  if (value instanceof Error) {
    return { name: value.name, message: redactText(value.message) };
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : redact(inner, depth + 1),
    ]),
  );
}
