/**
 * Cuentas de prueba del seed. Usan el dominio reservado `antojarte.example` (no existe: ningún
 * correo puede salir hacia una persona real) y el prefijo `seed.`, que es lo que borra `seed:clean`.
 * Hasta la Fase 15 el dominio era `antua.test`: la limpieza también borra esas cuentas viejas.
 */
export const SEED_DOMAIN = 'antojarte.example';
export const SEED_USER_DOMAINS = [SEED_DOMAIN, 'antua.test'] as const;

export const SEED_CUSTOMER_EMAIL = `seed.cliente@${SEED_DOMAIN}`;
export const SEED_ADMIN_EMAIL = `seed.admin@${SEED_DOMAIN}`;

/** "Lucía Fernández" → "seed.lucia@antojarte.example" (sin tildes, en minúsculas). */
export function seedEmail(fullName: string): string {
  const first = fullName
    .trim()
    .split(/\s+/)[0]
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
  return `seed.${first}@${SEED_DOMAIN}`;
}

/** Condición SQL de las cuentas de prueba (las de ahora y las de antes). Sin datos del usuario: es fija. */
export const SEED_USERS_WHERE = SEED_USER_DOMAINS.map(
  (domain) => `email LIKE 'seed.%@${domain}'`,
).join(' OR ');
