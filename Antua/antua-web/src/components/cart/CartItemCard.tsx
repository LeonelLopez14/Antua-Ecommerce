import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { formatPrice, variantLabel } from '../../lib/format'
import type { CartItem } from '../../types/cart'
import { ProductImage } from '../product/ProductImage'
import { QuantityStepper } from '../ui/QuantityStepper'
import { iconButtonClasses } from '../ui/buttonStyles'

interface CartItemCardProps {
  item: CartItem
  pending: boolean
  error: string | null
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
  onNavigate: () => void
}

/** Ítem del carrito (DESIGN.md §4): card accent-secondary con imagen, nombre, variante, stepper, quitar y precio. */
export function CartItemCard({ item, pending, error, onQuantityChange, onRemove, onNavigate }: CartItemCardProps) {
  const variant = variantLabel(item.variant.name)
  const name = item.product?.name ?? variant
  const errorId = `cart-item-${item.id}-error`

  return (
    <article
      aria-busy={pending || undefined}
      aria-describedby={error ? errorId : undefined}
      className={`flex gap-4 rounded-card bg-accent-secondary p-4 transition-[opacity] duration-200 ease-out dark:bg-dark-card ${pending ? 'opacity-70' : ''}`}
    >
      <ProductImage url={item.product?.imageUrl ?? null} width={80} height={80} surface="page" className="size-20 shrink-0" />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-lg leading-snug font-semibold wrap-break-word">
              {item.product ? (
                <Link to={`/producto/${item.product.slug}`} onClick={onNavigate} className="rounded-sm underline-offset-4 hover:underline">
                  {name}
                </Link>
              ) : (
                name
              )}
            </h3>
            {item.product && <p className="text-sm text-text-main/75 dark:text-dark-text-secondary">{variant}</p>}
          </div>
          <button
            type="button"
            onClick={onRemove}
            disabled={pending}
            aria-label={`Quitar ${name} (${variant}) del carrito`}
            className={iconButtonClasses(true)}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <QuantityStepper
            value={item.quantity}
            max={item.variant.stock}
            onChange={onQuantityChange}
            disabled={pending}
            label={`Cantidad de ${name}`}
            size="sm"
          />
          {/* Precio unitario del backend: el total por línea no viene de la API y no se calcula acá. */}
          <p className="text-right text-sm tabular-nums">
            <span className="block text-base font-bold text-accent-main dark:text-dark-accent-main">{formatPrice(item.unitPrice)}</span>
            <span className="text-text-main/75 dark:text-dark-text-secondary">c/u · ×{item.quantity}</span>
          </p>
        </div>

        {error && (
          <p id={errorId} role="alert" className="text-sm font-bold text-accent-main dark:text-dark-accent-main">
            {error}
          </p>
        )}
      </div>
    </article>
  )
}
