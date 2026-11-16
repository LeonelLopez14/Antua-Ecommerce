import { BadRequestException, ConflictException } from '@nestjs/common';
import { nextStock } from './admin-products.service';
import { slugify } from './slug';

describe('nextStock', () => {
  it('reposición suma, merma resta y ajuste fija el stock contado', () => {
    expect(nextStock(5, { reason: 'restock', quantity: 3 })).toBe(8);
    expect(nextStock(5, { reason: 'shrinkage', quantity: 2 })).toBe(3);
    expect(nextStock(5, { reason: 'adjustment', quantity: 0 })).toBe(0);
  });

  it('la merma no deja stock negativo y los movimientos vacíos no valen', () => {
    expect(() => nextStock(2, { reason: 'shrinkage', quantity: 3 })).toThrow(
      ConflictException,
    );
    expect(() => nextStock(2, { reason: 'restock', quantity: 0 })).toThrow(
      BadRequestException,
    );
    expect(() => nextStock(2, { reason: 'shrinkage', quantity: 0 })).toThrow(
      BadRequestException,
    );
  });
});

describe('slugify', () => {
  it('quita tildes, eñes y símbolos', () => {
    expect(slugify('  Galleta de Maní & Ñandú ')).toBe('galleta-de-mani-nandu');
    expect(slugify('¡¡¡')).toBe('');
  });
});
