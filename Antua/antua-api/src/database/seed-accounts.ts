/**
 * Cuentas de prueba del seed. Usan el dominio reservado `antojarte.example` (no existe: ningún
 * correo puede salir hacia una persona real) y el prefijo `seed.`, que es lo que borra `seed:clean`.
 * Hasta la Fase 15 el dominio era `antua.test`: la limpieza también borra esas cuentas viejas.
 */
export const SEED_DOMAIN = 'antojarte.example';
export const SEED_USER_DOMAINS = [SEED_DOMAIN, 'antua.test'] as const;

export const SEED_CUSTOMER_EMAIL = `seed.cliente@${SEED_DOMAIN}`;
export const SEED_ADMIN_EMAIL = `seed.admin@${SEED_DOMAIN}`;

/** Primer nombre sin tildes ni signos, en minúsculas: "Lucía (ejemplo)" → "lucia". */
const firstName = (fullName: string): string =>
  fullName
    .trim()
    .split(/\s+/)[0]
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

/** "Lucía Fernández" → "seed.lucia@antojarte.example". */
export function seedEmail(fullName: string): string {
  return `seed.${firstName(fullName)}@${SEED_DOMAIN}`;
}

/** Condición SQL de las cuentas de prueba (las de ahora y las de antes). Sin datos del usuario: es fija. */
export const SEED_USERS_WHERE = SEED_USER_DOMAINS.map(
  (domain) => `email LIKE 'seed.%@${domain}'`,
).join(' OR ');

/**
 * Cuentas de los datos de DEMOSTRACIÓN (`pnpm seed:demo`): prefijo `demo.`, aparte de las del seed
 * de desarrollo, así cada limpieza borra solo lo suyo.
 */
export function demoEmail(fullName: string): string {
  return `demo.${firstName(fullName)}@${SEED_DOMAIN}`;
}
export const DEMO_USERS_WHERE = `email LIKE 'demo.%@${SEED_DOMAIN}'`;
