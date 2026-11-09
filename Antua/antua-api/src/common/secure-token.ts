import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Token aleatorio de 256 bits, apto para URLs. Se entrega una sola vez. */
export const generateToken = (): string =>
  randomBytes(32).toString('base64url');

/**
 * Hash SHA-256 de un token. A diferencia de una contraseña, el token ya es aleatorio y largo,
 * así que no hace falta bcrypt: si se filtra la base, los hashes no sirven para usarlo.
 */
export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

/** Compara en tiempo constante: no revela cuántos caracteres coincidieron. */
export function tokenMatchesHash(
  token: string | undefined,
  hash: string | null | undefined,
): boolean {
  if (!token || !hash) return false;
  const given = Buffer.from(hashToken(token), 'hex');
  const stored = Buffer.from(hash, 'hex');
  return given.length === stored.length && timingSafeEqual(given, stored);
}
