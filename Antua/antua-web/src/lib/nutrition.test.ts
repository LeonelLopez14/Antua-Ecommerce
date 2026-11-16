import { describe, expect, it } from 'vitest'
import { parseNutrition } from './nutrition'

describe('parseNutrition', () => {
  it('convierte el formato con "|" en una tabla', () => {
    expect(parseNutrition('Valores | Por 100 g | Por unidad\nEnergía | 480 kcal | 192 kcal\n')).toEqual({
      kind: 'table',
      header: ['Valores', 'Por 100 g', 'Por unidad'],
      rows: [['Energía', '480 kcal', '192 kcal']],
    })
  })

  it('si no respeta el formato, devuelve el texto tal cual', () => {
    expect(parseNutrition('Por galleta: 140 kcal')).toEqual({ kind: 'text', text: 'Por galleta: 140 kcal' })
    expect(parseNutrition('A | B\nC')).toEqual({ kind: 'text', text: 'A | B\nC' })
  })
})
