import { describe, expect, it } from 'vitest'
import { normalizeCode, parseCount, parsePrice, validateProduct, validateVariant } from './adminForms'

describe('formularios del panel', () => {
  it('lee precios con coma o punto y como mucho 2 decimales', () => {
    expect(parsePrice('950,50')).toBe(950.5)
    expect(parsePrice('1500')).toBe(1500)
    expect(parsePrice('10.555')).toBeNull()
    expect(parsePrice('-3')).toBeNull()
    expect(parsePrice('0')).toBeNull()
    expect(parsePrice('abc')).toBeNull()
  })

  it('lee cantidades enteras no negativas', () => {
    expect(parseCount('0')).toBe(0)
    expect(parseCount('2.5')).toBeNull()
    expect(parseCount('-1')).toBeNull()
  })

  it('normaliza el código de cupón como el backend', () => {
    expect(normalizeCode(' verano 20 ')).toBe('VERANO20')
  })

  it('valida el producto y la variante', () => {
    const empty = { name: '', slug: 'Con Mayúsculas', description: '', ingredients: '', allergens: '', nutrition_info: '', is_active: false, tagIds: [] }
    expect(Object.keys(validateProduct(empty)).sort()).toEqual(['allergens', 'description', 'ingredients', 'name', 'slug'])
    expect(validateVariant({ price: '10', stock: '3', sku: 'A1' }, true)).toEqual({})
    expect(Object.keys(validateVariant({ price: '0', stock: 'x', sku: 'a' }, true))).toEqual(['price', 'stock', 'sku'])
  })
})
