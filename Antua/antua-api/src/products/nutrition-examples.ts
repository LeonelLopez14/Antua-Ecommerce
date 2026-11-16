/**
 * Valores de EJEMPLO de docs/contenido-sitio.md §6 (inventados, proyecto de práctica).
 * Los usa scripts/nutrition-examples.ts. Funciones puras, con unit tests.
 */
export type Category = 'clasicas' | 'sin-gluten' | 'veganas' | 'sin-azucar';

interface Values {
  /** Por unidad (40 g): energía (kcal), carbohidratos, azúcares, grasas, saturadas, proteínas, fibra (g), sodio (mg). */
  unit: [number, number, number, number, number, number, number, number];
  ingredients: string;
  allergens: string;
}

export const EXAMPLES: Record<Category, Values> = {
  clasicas: {
    unit: [192, 24.0, 12.0, 9.2, 4.8, 2.0, 0.8, 88],
    ingredients:
      'Harina de trigo, manteca, azúcar, huevo, chips de chocolate, esencia de vainilla, polvo de hornear, sal',
    allergens:
      'Gluten (trigo), lácteos, huevo. Puede contener frutos secos y soja',
  },
  'sin-gluten': {
    unit: [188, 22.0, 11.2, 10.0, 3.6, 2.4, 1.6, 72],
    ingredients:
      'Harina de arroz, almidón de maíz, harina de almendras, manteca, azúcar, huevo, chips de chocolate, esencia de vainilla, sal',
    allergens: 'Lácteos, huevo, frutos secos (almendras). Puede contener soja',
  },
  veganas: {
    unit: [184, 24.8, 11.6, 8.4, 4.0, 1.6, 1.2, 80],
    ingredients:
      'Harina de trigo, aceite de coco, azúcar, bebida de avena, chips de chocolate sin lácteos, esencia de vainilla, polvo de hornear, sal',
    allergens: 'Gluten (trigo), avena. Puede contener frutos secos y soja',
  },
  'sin-azucar': {
    unit: [160, 20.8, 0.8, 8.8, 4.4, 2.4, 2.4, 80],
    ingredients:
      'Harina de trigo, manteca, eritritol, huevo, chips de chocolate sin azúcar, esencia de vainilla, polvo de hornear, sal',
    allergens:
      'Gluten (trigo), lácteos, huevo. Puede contener frutos secos y soja. Contiene polialcoholes: en exceso puede tener efecto laxante',
  },
};

const PRIORITY: Category[] = [
  'sin-azucar',
  'sin-gluten',
  'veganas',
  'clasicas',
];
const UNIT_GRAMS = 40;

const decimal = new Intl.NumberFormat('es-UY', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const integer = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 });

/** Tabla en el formato que entiende la Ficha (antua-web/src/lib/nutrition.ts). */
export function nutritionTable(category: Category): string {
  const [kcal, carbs, sugars, fat, saturated, protein, fiber, sodium] =
    EXAMPLES[category].unit;
  const per100 = (value: number) => value * (100 / UNIT_GRAMS);
  const grams = (value: number) => `${decimal.format(value)} g`;
  const rows: [string, string, string][] = [
    [
      'Energía',
      `${integer.format(per100(kcal))} kcal`,
      `${integer.format(kcal)} kcal`,
    ],
    ['Carbohidratos', grams(per100(carbs)), grams(carbs)],
    ['de los cuales azúcares', grams(per100(sugars)), grams(sugars)],
    ['Grasas', grams(per100(fat)), grams(fat)],
    ['de las cuales saturadas', grams(per100(saturated)), grams(saturated)],
    ['Proteínas', grams(per100(protein)), grams(protein)],
    ['Fibra', grams(per100(fiber)), grams(fiber)],
    [
      'Sodio',
      `${integer.format(per100(sodium))} mg`,
      `${integer.format(sodium)} mg`,
    ],
  ];
  return [['Valores', 'Por 100 g', `Por unidad (${UNIT_GRAMS} g)`], ...rows]
    .map((row) => row.join(' | '))
    .join('\n');
}

export function categoryOf(tagSlugs: string[]): Category | null {
  const slugs = tagSlugs.map((slug) =>
    slug === 'de-temporada' ? 'clasicas' : slug,
  );
  return PRIORITY.find((category) => slugs.includes(category)) ?? null;
}
