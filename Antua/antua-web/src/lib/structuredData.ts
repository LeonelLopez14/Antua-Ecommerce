import type { Product, Review } from '../types/product'
import { CURRENCY } from './format'

type JsonLd = Record<string, unknown>

/**
 * Datos estructurados schema.org/Product de la Ficha: una oferta por variante activa, en UYU,
 * con disponibilidad según el stock, y la valoración si hay reseñas visibles.
 */
export function productJsonLd(product: Product, reviews: Review[], origin: string): JsonLd {
  const url = `${origin}/producto/${product.slug}`
  const data: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    url,
    brand: { '@type': 'Brand', name: 'Antojarte' },
    image: product.images.map((image) => new URL(image.url, origin).href).filter((href) => href.startsWith('http')),
    offers: product.variants.map((variant) => ({
      '@type': 'Offer',
      sku: variant.sku,
      name: variant.name,
      price: variant.price.toFixed(2),
      priceCurrency: CURRENCY,
      availability: variant.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${url}?variante=${variant.name}`,
    })),
  }
  if (reviews.length > 0) {
    const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    data.aggregateRating = { '@type': 'AggregateRating', ratingValue: average.toFixed(1), reviewCount: reviews.length, bestRating: 5, worstRating: 1 }
  }
  return data
}
