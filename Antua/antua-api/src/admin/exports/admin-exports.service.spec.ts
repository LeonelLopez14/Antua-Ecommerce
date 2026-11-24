import { UnprocessableEntityException } from '@nestjs/common';
import { assertWithinLimit, EXPORT_MAX_ROWS } from './admin-exports.service';

describe('tope de filas de las exportaciones', () => {
  it('deja pasar hasta el máximo', () => {
    expect(() =>
      assertWithinLimit(EXPORT_MAX_ROWS, 'pedidos', ''),
    ).not.toThrow();
  });

  it('rechaza con 422 y explica qué hacer', () => {
    expect(() =>
      assertWithinLimit(EXPORT_MAX_ROWS + 1, 'pedidos', 'Acotá el rango.'),
    ).toThrow(UnprocessableEntityException);
    try {
      assertWithinLimit(EXPORT_MAX_ROWS + 1, 'pedidos', 'Acotá el rango.');
    } catch (error) {
      expect(
        (error as UnprocessableEntityException).getResponse(),
      ).toMatchObject({
        code: 'EXPORT_TOO_LARGE',
        message: expect.stringContaining('Acotá el rango.') as unknown,
      });
    }
  });
});
