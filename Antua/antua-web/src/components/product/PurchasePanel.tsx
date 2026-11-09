import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { formatPrice, variantLabel } from '../../lib/format'
import { useCartStore } from '../../stores/cartStore'
import type { Product, ProductVariant } from '../../types/product'
import { Button } from '../ui/Button'
import { QuantityStepper } from '../ui/QuantityStepper'
import { TagBadge } from './TagBadge'
import { VariantPicker } from './VariantPicker'

interface PurchasePanelProps {
  product: Product
}

const LOW_STOCK = 5
const VARIANT_PARAM = 'variante'

type Feedback = { kind: 'success' | 'error'; text: string } | null

/** Panel de compra (DESIGN.md §4): tags, título, precio, descripción, variante, cantidad y los dos CTA. */
export function PurchasePanel({ product }: PurchasePanelProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.open)
  const addButtonRef = useRef<HTMLButtonElement>(null)

  // La variante elegida va en la URL (?variante=x6) para poder compartir el link exacto.
  const firstAvailable = product.variants.find((v) => v.stock > 0) ?? product.variants[0] ?? null
  const fromUrl = product.variants.find((v) => v.name === searchParams.get(VARIANT_PARAM) && v.stock > 0)
  const variant: ProductVariant | null = fromUrl ?? firstAvailable

  const [quantity, setQuantity] = useState(1)
  const [pending, setPending] = useState<'add' | 'buy' | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const maxQuantity = Math.max(1, variant?.stock ?? 1)
  const effectiveQuantity = Math.min(quantity, maxQuantity)
  const soldOut = !variant || variant.stock <= 0

  const selectVariant = (next: ProductVariant) => {
    setFeedback(null)
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.set(VARIANT_PARAM, next.name)
        return params
      },
      { replace: true, preventScrollReset: true },
    )
  }

  const add = async (mode: 'add' | 'buy') => {
    if (!variant || pending) return
    setPending(mode)
    setFeedback(null)
    const result = await addItem(variant.id, effectiveQuantity)
    setPending(null)

    if (!result.ok) {
      // Se muestra el mensaje del backend tal cual; si es de stock, se suma qué hacer.
      const hint = /stock/i.test(result.error) ? ' Probá con menos unidades o elegí otra presentación.' : ''
      setFeedback({ kind: 'error', text: `${result.error}.${hint}`.replace(/\.\./, '.') })
      return
    }
    if (mode === 'buy') {
      navigate('/checkout')
      return
    }
    setFeedback({
      kind: 'success',
      text: `Agregaste ${effectiveQuantity} × ${product.name} (${variantLabel(variant.name)}) al carrito.`,
    })
    // DESIGN.md: "Agregar al carrito" abre el drawer sin salir de la página.
    openCart(addButtonRef.current)
  }

  return (
    <div className="rounded-card bg-surface p-6 shadow-soft md:p-8 dark:bg-dark-surface dark:shadow-none">
      {product.tags.length > 0 && (
        <ul aria-label="Etiquetas" className="flex flex-wrap gap-2">
          {product.tags.map((tag) => (
            <li key={tag.id}>
              <TagBadge>{tag.name}</TagBadge>
            </li>
          ))}
        </ul>
      )}

      <h1 className="mt-4 font-display text-[clamp(2rem,4vw,2.75rem)] leading-tight font-bold wrap-break-word">
        {product.name}
      </h1>

      {variant && (
        <p className="mt-3 text-3xl font-bold text-accent-main tabular-nums dark:text-dark-accent-main">
          {formatPrice(variant.price)}
          <span className="ml-2 text-base font-normal text-text-main/75 dark:text-dark-text-secondary">
            {variantLabel(variant.name)}
          </span>
        </p>
      )}

      <p className="mt-4 leading-relaxed text-text-main/90 dark:text-dark-text-secondary">{product.description}</p>

      {product.variants.length > 0 ? (
        <div className="mt-6 flex flex-col gap-6">
          {product.variants.length > 1 && (
            <VariantPicker variants={product.variants} selectedId={variant?.id ?? null} onSelect={selectVariant} />
          )}

          {!soldOut && (
            <div className="flex flex-wrap items-center gap-4">
              <QuantityStepper
                value={effectiveQuantity}
                max={maxQuantity}
                onChange={(n) => {
                  setFeedback(null)
                  setQuantity(n)
                }}
                label={`Cantidad de ${product.name}`}
              />
              {variant.stock <= LOW_STOCK && (
                <p className="text-sm font-bold text-accent-main dark:text-dark-accent-main">
                  {variant.stock === 1 ? '¡Queda 1!' : `¡Quedan ${variant.stock}!`}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              ref={addButtonRef}
              loading={pending === 'add'}
              disabled={soldOut || pending === 'buy'}
              onClick={() => void add('add')}
              className="flex-1"
            >
              {pending !== 'add' && <ShoppingBag aria-hidden="true" className="size-5" />}
              {pending === 'add' ? 'Agregando…' : 'Agregar al carrito'}
            </Button>
            <Button
              variant="secondary"
              loading={pending === 'buy'}
              disabled={soldOut || pending === 'add'}
              onClick={() => void add('buy')}
              className="flex-1"
            >
              {pending === 'buy' ? 'Agregando…' : 'Comprar ahora'}
            </Button>
          </div>
          {soldOut && <p className="font-bold">Esta presentación está sin stock por ahora.</p>}
        </div>
      ) : (
        <p className="mt-6 font-bold">Esta galleta no está a la venta por ahora.</p>
      )}

      {/* Siempre montado: los lectores de pantalla anuncian los cambios. */}
      <div aria-live="polite" className="mt-4 empty:hidden">
        {feedback && (
          <p
            className={`rounded-xl px-4 py-3 text-sm font-bold ${
              feedback.kind === 'success'
                ? 'bg-accent-tertiary text-text-main dark:bg-dark-card dark:text-dark-text-main'
                : 'bg-accent-secondary text-text-main dark:bg-dark-card dark:text-dark-accent-main'
            }`}
          >
            {feedback.text}
          </p>
        )}
      </div>
    </div>
  )
}
