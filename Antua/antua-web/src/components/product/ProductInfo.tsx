import type { Product } from '../../types/product'
import { NUTRITION_EXAMPLE_NOTE, parseNutrition } from '../../lib/nutrition'

interface ProductInfoProps {
  product: Product
}

const card = 'rounded-card bg-surface p-6 dark:bg-dark-surface'

/** Ingredientes, alérgenos y nutrición: siempre visibles, sin tabs (DESIGN.md §4). */
export function ProductInfo({ product }: ProductInfoProps) {
  const nutrition = product.nutritionInfo ? parseNutrition(product.nutritionInfo) : null

  return (
    <section aria-labelledby="info-title">
      <h2 id="info-title" className="font-display text-3xl font-semibold">
        Qué lleva
      </h2>
      {/* grid-cols-1 = minmax(0, 1fr): la tabla nutricional scrollea en su región en vez de ensanchar la página (320 px). */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className={card}>
          <h3 className="font-display text-xl font-semibold">Ingredientes</h3>
          <p className="mt-3 wrap-break-word">{product.ingredients || 'Sin datos por ahora.'}</p>
        </div>
        <div className={card}>
          <h3 className="font-display text-xl font-semibold">Alérgenos</h3>
          <p className="mt-3 wrap-break-word">{product.allergens || 'Sin datos por ahora.'}</p>
        </div>
        <div className={`${card} md:col-span-2`}>
          <h3 id="nutricion-title" className="font-display text-xl font-semibold">
            Información nutricional
          </h3>
          {!nutrition && <p className="mt-3 text-text-main/80 dark:text-dark-text-secondary">Todavía no cargamos la información nutricional de esta galleta.</p>}
          {nutrition?.kind === 'text' && <p className="mt-3 whitespace-pre-line wrap-break-word">{nutrition.text}</p>}
          {nutrition?.kind === 'table' && (
            <div role="region" aria-labelledby="nutricion-title" tabIndex={0} className="relative mt-3 overflow-x-auto">
              <table className="w-full min-w-[320px] border-collapse text-left text-sm">
                <caption className="sr-only">Información nutricional de {product.name}</caption>
                <thead>
                  <tr className="border-b border-text-main/20 dark:border-dark-text-main/20">
                    {nutrition.header.map((cell, index) => (
                      <th key={cell} scope="col" className={`py-2 pr-3 font-bold ${index > 0 ? 'text-right' : ''}`}>
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nutrition.rows.map(([label, ...values]) => (
                    <tr key={label} className="border-b border-text-main/10 last:border-0 dark:border-dark-text-main/10">
                      <th scope="row" className={`py-2 pr-3 font-normal ${label?.startsWith('de ') ? 'pl-4' : ''}`}>
                        {label}
                      </th>
                      {values.map((value, index) => (
                        <td key={index} className="py-2 pr-3 text-right tabular-nums">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {nutrition && <p className="mt-3 text-sm text-text-main/80 dark:text-dark-text-secondary">{NUTRITION_EXAMPLE_NOTE}</p>}
        </div>
      </div>
    </section>
  )
}
