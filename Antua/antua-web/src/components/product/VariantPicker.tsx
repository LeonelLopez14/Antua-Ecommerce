import { formatPrice, variantLabel } from '../../lib/format'
import type { ProductVariant } from '../../types/product'

interface VariantPickerProps {
  variants: ProductVariant[]
  selectedId: number | null
  onSelect: (variant: ProductVariant) => void
}

/** Radios nativos con estilo de tarjeta: teclado (flechas) y lectores de pantalla funcionan sin ARIA extra. */
export function VariantPicker({ variants, selectedId, onSelect }: VariantPickerProps) {
  return (
    <fieldset>
      <legend className="text-sm font-bold">Elegí la presentación</legend>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {variants.map((variant) => {
          const soldOut = variant.stock <= 0
          const checked = variant.id === selectedId
          return (
            <label
              key={variant.id}
              className={`relative flex min-h-11 cursor-pointer flex-col rounded-xl border-2 px-4 py-3 transition-[border-color,background-color] duration-200 ease-out has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-main dark:has-[:focus-visible]:outline-dark-accent-main ${
                checked
                  ? 'border-accent-main bg-accent-secondary dark:border-dark-accent-main dark:bg-dark-card'
                  : 'border-text-main/25 hover:bg-accent-secondary/60 dark:border-dark-text-secondary/40 dark:hover:bg-dark-card'
              } ${soldOut ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="radio"
                name="variante"
                value={variant.id}
                checked={checked}
                disabled={soldOut}
                onChange={() => onSelect(variant)}
                className="sr-only"
              />
              <span className="font-bold">{variantLabel(variant.name)}</span>
              <span className="text-sm text-accent-main tabular-nums dark:text-dark-accent-main">
                {soldOut ? 'Sin stock' : formatPrice(variant.price)}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
