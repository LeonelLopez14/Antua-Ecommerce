import {
  SEED_ADMIN_EMAIL,
  SEED_CUSTOMER_EMAIL,
  SEED_USERS_WHERE,
  seedEmail,
} from './seed-accounts';

describe('cuentas de prueba del seed', () => {
  it('usan el dominio reservado antojarte.example', () => {
    expect(SEED_CUSTOMER_EMAIL).toBe('seed.cliente@antojarte.example');
    expect(SEED_ADMIN_EMAIL).toBe('seed.admin@antojarte.example');
    expect(seedEmail('Lucía Fernández')).toBe('seed.lucia@antojarte.example');
    expect(seedEmail('  Martín   Pérez ')).toBe(
      'seed.martin@antojarte.example',
    );
  });

  // Traduce el LIKE de SQL a una expresión regular para comprobar qué filas borraría la limpieza.
  const matchesCleanup = (email: string) =>
    SEED_USERS_WHERE.split(' OR ').some((clause) => {
      const pattern = /LIKE '(.+)'/.exec(clause)?.[1] ?? '';
      const regex = pattern
        .split('%')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*');
      return new RegExp(`^${regex}$`).test(email);
    });

  it('la limpieza borra las cuentas nuevas y las viejas de @antua.test', () => {
    expect(matchesCleanup('seed.cliente@antojarte.example')).toBe(true);
    expect(matchesCleanup('seed.admin@antua.test')).toBe(true);
  });

  it('la limpieza no toca cuentas reales ni otras del mismo dominio', () => {
    expect(matchesCleanup('cliente@antojarte.example')).toBe(false);
    expect(matchesCleanup('seed.cliente@gmail.com')).toBe(false);
    expect(matchesCleanup('ana@antua.test')).toBe(false);
  });
});
