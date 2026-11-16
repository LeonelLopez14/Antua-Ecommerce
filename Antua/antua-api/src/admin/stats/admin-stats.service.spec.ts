import { fillDailySeries } from './admin-stats.service';

describe('fillDailySeries', () => {
  it('devuelve exactamente los últimos N días, con ceros donde no hubo pedidos', () => {
    const series = fillDailySeries(
      [{ day: '2026-11-14', orders: 2, revenue: 3000 }],
      '2026-11-15',
      3,
    );
    expect(series).toEqual([
      { day: '2026-11-13', orders: 0, revenue: 0 },
      { day: '2026-11-14', orders: 2, revenue: 3000 },
      { day: '2026-11-15', orders: 0, revenue: 0 },
    ]);
  });
});
