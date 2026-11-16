/**
 * Fechas "de calendario" de la tienda. La base guarda UTC (ver la conexión con timezone 'Z');
 * "hoy" y los rangos de fechas del panel se calculan en la hora de Uruguay.
 */
export const STORE_TIME_ZONE = 'America/Montevideo';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: STORE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Fecha local de la tienda como "YYYY-MM-DD". */
export const storeDate = (instant: Date): string =>
  dayFormatter.format(instant);

/** Minutos que la zona está adelantada respecto de UTC en ese instante (Uruguay: −180). */
export function storeOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return Math.round(
    (asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60_000,
  );
}

/** Instante UTC en que empieza el día local "YYYY-MM-DD" de la tienda. */
export function startOfStoreDay(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  const midnightUtc = Date.UTC(year, month - 1, date);
  // Se corrige con el offset de ese momento (por si la zona tuviera horario de verano).
  const first =
    midnightUtc - storeOffsetMinutes(new Date(midnightUtc)) * 60_000;
  return new Date(midnightUtc - storeOffsetMinutes(new Date(first)) * 60_000);
}

/** "YYYY-MM-DD" ± n días (aritmética de calendario, sin horas). */
export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + days))
    .toISOString()
    .slice(0, 10);
}

/** El offset como lo entiende MySQL en CONVERT_TZ: −180 → "-03:00". */
export function mysqlOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}
