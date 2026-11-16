import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProductInfo } from './ProductInfo'
import type { Product } from '../../types/product'

const product = (nutritionInfo: string | null): Product => ({
  id: 1,
  slug: 'clasica',
  name: 'Clásica',
  description: '',
  ingredients: 'Harina',
  allergens: 'Gluten',
  nutritionInfo,
  basePrice: 100,
  isActive: true,
  fromPrice: 100,
  variants: [],
  images: [],
  tags: [],
})

describe('ProductInfo', () => {
  it('muestra la tabla nutricional con la nota de ejemplo', () => {
    render(<ProductInfo product={product('Valores | Por 100 g | Por unidad (40 g)\nEnergía | 480 kcal | 192 kcal')} />)
    expect(screen.getByRole('table', { name: 'Información nutricional de Clásica' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Energía' })).toBeInTheDocument()
    expect(screen.getByText(/Información nutricional de ejemplo \(proyecto de práctica\)/)).toBeInTheDocument()
    expect(screen.queryByText(/Pronto/)).not.toBeInTheDocument()
  })

  it('sin datos no promete nada ni muestra la nota', () => {
    render(<ProductInfo product={product(null)} />)
    expect(screen.getByText('Todavía no cargamos la información nutricional de esta galleta.')).toBeInTheDocument()
    expect(screen.queryByText(/de ejemplo/)).not.toBeInTheDocument()
  })
})
