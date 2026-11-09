import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProductCard } from './ProductCard'
import type { Product } from '../../types/product'

const product: Product = {
  id: 1,
  slug: 'clasica-chips',
  name: 'Clásica con chips',
  description: 'La de siempre, con chips de chocolate.',
  ingredients: '',
  allergens: '',
  basePrice: 2400,
  isActive: true,
  fromPrice: 2400,
  variants: [
    { id: 3, name: 'x1', price: 2400, stock: 40, sku: 'A1' },
    { id: 2, name: 'x6', price: 12960, stock: 15, sku: 'A6' },
  ],
  images: [],
  tags: [{ id: 1, name: 'Clásicas', slug: 'clasicas' }],
}

const renderCard = (p: Product) =>
  render(
    <MemoryRouter>
      <ProductCard product={p} />
    </MemoryRouter>,
  )

describe('ProductCard', () => {
  it('enlaza a la ficha por slug', () => {
    renderCard(product)
    expect(screen.getByRole('link', { name: 'Clásica con chips' })).toHaveAttribute('href', '/producto/clasica-chips')
  })

  it('muestra "Desde" y el precio en pesos cuando hay varias variantes', () => {
    renderCard(product)
    const price = screen.getByText(/Desde/).parentElement
    expect(price?.textContent?.replace(/\s/g, ' ')).toMatch(/Desde\s+\$\s?2\.400/)
  })

  it('sin varias variantes no dice "Desde"', () => {
    renderCard({ ...product, variants: [product.variants[0]!] })
    expect(screen.queryByText(/Desde/)).not.toBeInTheDocument()
  })

  it('lista las etiquetas y usa el fallback ilustrado sin foto', () => {
    renderCard(product)
    expect(screen.getByRole('list', { name: 'Etiquetas' })).toHaveTextContent('Clásicas')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
