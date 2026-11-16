import { sanitizeChanges } from './audit.service';

describe('sanitizeChanges', () => {
  it('quita contraseñas, tokens y hashes aunque estén anidados', () => {
    expect(
      sanitizeChanges({
        name: 'Galleta',
        password: 'x',
        nested: {
          access_token: 'y',
          price: 100,
          items: [{ secretKey: 1, sku: 'a' }],
        },
        password_hash: 'z',
      }),
    ).toEqual({
      name: 'Galleta',
      nested: { price: 100, items: [{ sku: 'a' }] },
    });
  });
});
