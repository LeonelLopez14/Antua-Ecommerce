import { categoryOf, nutritionTable } from './nutrition-examples';

describe('información nutricional de ejemplo', () => {
  it('elige la categoría por prioridad y deja afuera los surtidos', () => {
    expect(categoryOf(['veganas', 'sin-azucar'])).toBe('sin-azucar');
    expect(categoryOf(['clasicas'])).toBe('clasicas');
    expect(categoryOf(['de-temporada'])).toBe('clasicas');
    expect(categoryOf(['packs'])).toBeNull();
    expect(categoryOf([])).toBeNull();
  });

  it('arma la tabla por 100 g y por unidad (40 g)', () => {
    const lines = nutritionTable('clasicas').split('\n');
    expect(lines[0]).toBe('Valores | Por 100 g | Por unidad (40 g)');
    expect(lines[1]).toBe('Energía | 480 kcal | 192 kcal');
    expect(lines[2]).toBe('Carbohidratos | 60,0 g | 24,0 g');
    expect(lines[8]).toBe('Sodio | 220 mg | 88 mg');
    expect(lines).toHaveLength(9);
  });
});
