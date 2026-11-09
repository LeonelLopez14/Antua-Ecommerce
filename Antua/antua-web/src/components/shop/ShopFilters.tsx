import type { Tag } from '../../types/product'
import type { ShopQuery } from '../../lib/shopQuery'
import { PriceRangeFilter } from './PriceRangeFilter'

interface ShopFiltersProps {
  tags: Tag[]
  /** Cantidad de productos por tag (sobre el catálogo completo). */
  counts: Record<string, number>
  priceBounds: { min: number; max: number } | null
  query: ShopQuery
  onToggleCategory: (slug: string) => void
  onPriceChange: (min: number | null, max: number | null) => void
}

/** Contenido de los filtros: se usa en el sidebar (escritorio) y en el drawer (mobile). */
export function ShopFilters({ tags, counts, priceBounds, query, onToggleCategory, onPriceChange }: ShopFiltersProps) {
  return (
    <div className="flex flex-col gap-8">
      <fieldset>
        <legend className="font-display text-lg font-semibold">Categorías</legend>
        <ul className="mt-3 flex flex-col gap-1">
          {tags.map((tag) => {
            const checked = query.categories.includes(tag.slug)
            return (
              <li key={tag.id}>
                {/* El label envuelve al checkbox: una sola zona de clic, sin huecos. */}
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 transition-[background-color] duration-200 ease-out hover:bg-accent-secondary dark:hover:bg-dark-card">
                  <input
                    type="checkbox"
                    name="categoria"
                    value={tag.slug}
                    checked={checked}
                    onChange={() => onToggleCategory(tag.slug)}
                    className="size-5 shrink-0 cursor-pointer accent-accent-main dark:accent-dark-accent-main"
                  />
                  <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                  <span className="text-sm text-text-main/70 tabular-nums dark:text-dark-text-secondary">
                    {counts[tag.slug] ?? 0}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <PriceRangeFilter min={query.minPrice} max={query.maxPrice} bounds={priceBounds} onChange={onPriceChange} />
    </div>
  )
}
