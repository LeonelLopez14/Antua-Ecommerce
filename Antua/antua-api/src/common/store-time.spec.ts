import {
  addDays,
  mysqlOffset,
  startOfStoreDay,
  storeDate,
  storeOffsetMinutes,
} from './store-time';

describe('hora de la tienda (America/Montevideo)', () => {
  it('Uruguay está 3 horas detrás de UTC', () => {
    expect(storeOffsetMinutes(new Date('2026-11-15T12:00:00Z'))).toBe(-180);
    expect(mysqlOffset(-180)).toBe('-03:00');
  });

  it('el día local empieza a las 03:00 UTC', () => {
    expect(startOfStoreDay('2026-11-15').toISOString()).toBe(
      '2026-11-15T03:00:00.000Z',
    );
  });

  it('a las 01:00 UTC todavía es el día anterior en Montevideo', () => {
    expect(storeDate(new Date('2026-11-16T01:00:00Z'))).toBe('2026-11-15');
    expect(storeDate(new Date('2026-11-16T03:00:00Z'))).toBe('2026-11-16');
  });

  it('suma días de calendario, también entre meses', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
