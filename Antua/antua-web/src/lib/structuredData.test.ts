import { describe, expect, it } from 'vitest'
import { productJsonLd } from './structuredData'
import type { Product } from '../types/product'

const product: Product = {
  id: 1,
  slug: 'clasica',
  name: 'Clásica',
  description: 'Rica',
  ingredients: '',
  allergens: '',
  nutritionInfo: null,
  basePrice: 950,
  isActive: true,
  fromPrice: 950,
  variants: [
    { id: 1, name: 'x1', price: 950, stock: 3, sku: 'C-X1' },
    { id: 2, name: 'x6', price: 5400.5, stock: 0, sku: 'C-X6' },
  ],
  images: [{ id: 1, url: '/api/uploads/products/a.webp' }],
  tags: [],
}

describe('productJsonLd', () => {
  it('una oferta por variante en UYU, con disponibilidad según el stock', () => {
    const data = productJsonLd(product, [], 'https://antua.example')
    expect(data).toMatchObject({ '@type': 'Product', name: 'Clásica', url: 'https://antua.example/producto/clasica' })
    expect(data.image).toEqual(['https://antua.example/api/uploads/products/a.webp'])
    expect(data.offers).toEqual([
      expect.objectContaining({ price: '950.00', priceCurrency: 'UYU', availability: 'https://schema.org/InStock' }),
      expect.objectContaining({ price: '5400.50', availability: 'https://schema.org/OutOfStock' }),
    ])
    expect(data.aggregateRating).toBeUndefined()
  })

  it('suma la valoración si hay reseñas', () => {
    const reviews = [4, 5].map((rating, id) => ({ id, rating, comment: null, createdAt: '', authorName: null, authorId: null }))
    expect(productJsonLd(product, reviews, 'https://antua.example').aggregateRating).toMatchObject({ ratingValue: '4.5', reviewCount: 2 })
  })
})
