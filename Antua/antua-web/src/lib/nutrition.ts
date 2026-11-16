/**
 * Información nutricional: se guarda como texto en products.nutrition_info (editable desde el panel).
 * Formato de tabla, una fila por línea, celdas separadas por "|":
 *
 *   Valores | Por 100 g | Por unidad (40 g)
 *   Energía | 480 kcal | 192 kcal
 *
 * La primera línea es el encabezado. Si el texto no respeta el formato, se muestra tal cual.
 */
export type NutritionContent =
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'text'; text: string }

export function parseNutrition(text: string): NutritionContent {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const cells = lines.map((line) => line.split('|').map((cell) => cell.trim()))
  const width = cells[0]?.length ?? 0
  const isTable = cells.length >= 2 && width >= 2 && cells.every((row) => row.length === width && row.every(Boolean))
  if (!isTable) return { kind: 'text', text: text.trim() }
  const [header = [], ...rows] = cells
  return { kind: 'table', header, rows }
}


/** Los valores cargados en la Fase 13 son inventados: la nota se muestra siempre junto a la tabla. */
export const NUTRITION_EXAMPLE_NOTE = 'Información nutricional de ejemplo (proyecto de práctica). No corresponde a un producto real.'
