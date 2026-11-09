import type { Product } from '../../types/product'

interface ProductInfoProps {
  product: Product
}

const card = 'rounded-card bg-surface p-6 dark:bg-dark-surface'

/** Ingredientes, alérgenos y nutrición: siempre visibles, sin tabs (DESIGN.md §4). */
export function ProductInfo({ product }: ProductInfoProps) {
  return (
    <section aria-labelledby="info-title">
      <h2 id="info-title" className="font-display text-3xl font-semibold">
        Qué lleva
      </h2>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className={card}>
          <h3 className="font-display text-xl font-semibold">Ingredientes</h3>
          <p className="mt-3 wrap-break-word">{product.ingredients || 'Sin datos por ahora.'}</p>
        </div>
        <div className={card}>
          <h3 className="font-display text-xl font-semibold">Alérgenos</h3>
          <p className="mt-3 wrap-break-word">{product.allergens || 'Sin datos por ahora.'}</p>
        </div>
        <div className={card}>
          <h3 className="font-display text-xl font-semibold">Información nutricional</h3>
          {/* TODO(api): Product no tiene campo de información nutricional todavía. */}
          <p className="mt-3 text-text-main/80 dark:text-dark-text-secondary">
            Pronto vas a encontrar acá la información nutricional de esta galleta.
          </p>
        </div>
      </div>
    </section>
  )
}
