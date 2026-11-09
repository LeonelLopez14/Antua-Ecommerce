import { Link } from 'react-router-dom'
import { formatPrice } from '../../lib/format'
import type { Product } from '../../types/product'
import { ProductImage } from './ProductImage'
import { TagBadge } from './TagBadge'

interface ProductCardProps {
  product: Product
  /** Imagen con prioridad (primeras cards visibles sin scroll). */
  priority?: boolean
}

/** Card de producto (DESIGN.md §4): radio 20 px, padding 24 px, precio en accent-main. Se usa en Home y Tienda. */
export function ProductCard({ product, priority = false }: ProductCardProps) {
  const [image] = product.images

  return (
    <article className="group relative flex h-full flex-col rounded-card bg-bg p-6 shadow-soft transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift focus-within:shadow-lift motion-reduce:hover:translate-y-0 dark:bg-dark-card dark:shadow-none dark:hover:shadow-dark-float">
      <ProductImage url={image?.url ?? null} priority={priority} className="aspect-square" />

      {product.tags.length > 0 && (
        <ul aria-label="Etiquetas" className="mt-4 flex flex-wrap gap-2">
          {product.tags.map((tag) => (
            <li key={tag.id}>
              <TagBadge>{tag.name}</TagBadge>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-3 font-display text-xl leading-snug font-semibold wrap-break-word">
        {/* El ::after estira el link a toda la card sin anidar elementos interactivos. */}
        <Link
          to={`/producto/${product.slug}`}
          className="rounded-sm after:absolute after:inset-0 after:rounded-card after:content-['']"
        >
          {product.name}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-text-main/80 dark:text-dark-text-secondary">
        {product.description}
      </p>
      {product.fromPrice > 0 && (
        <p className="mt-auto pt-4 text-xl font-bold text-accent-main tabular-nums dark:text-dark-accent-main">
          {product.variants.length > 1 && (
            <span className="text-sm font-normal text-text-main/70 dark:text-dark-text-secondary">Desde </span>
          )}
          {formatPrice(product.fromPrice)}
        </p>
      )}
    </article>
  )
}
