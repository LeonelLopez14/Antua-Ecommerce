import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { selectItemCount, useCartStore } from '../../stores/cartStore'
import { cartItemErrorMessage } from '../../lib/cartMessages'
import { variantLabel } from '../../lib/format'
import type { CartItem } from '../../types/cart'
import { Drawer } from '../ui/Drawer'
import { Button } from '../ui/Button'
import { ButtonLink } from '../ui/ButtonLink'
import { ErrorState } from '../ui/ErrorState'
import { EmptyState } from '../ui/EmptyState'
import { CartItemCard } from './CartItemCard'
import { CouponField } from './CouponField'
import { CartTotals } from './CartTotals'
import { skeletonBar } from '../ui/skeleton'

/** Segundos que se ofrece "Deshacer" después de quitar un ítem. */
const UNDO_MS = 6000

interface Removed {
  variantId: number
  quantity: number
  label: string
}

/**
 * Carrito como drawer lateral (DESIGN.md §4). Reutiliza Drawer: role="dialog", foco atrapado,
 * Escape y overlay cierran, foco de vuelta al botón que lo abrió, GSAP con reduced motion.
 */
export function CartDrawer() {
  const { pathname } = useLocation()
  const isOpen = useCartStore((s) => s.isOpen)
  const close = useCartStore((s) => s.close)
  const returnFocusTo = useCartStore((s) => s.returnFocusTo)
  const cart = useCartStore((s) => s.cart)
  const summary = useCartStore((s) => s.summary)
  const status = useCartStore((s) => s.status)
  const loadError = useCartStore((s) => s.loadError)
  const pendingItemIds = useCartStore((s) => s.pendingItemIds)
  const itemCount = useCartStore(selectItemCount)
  const load = useCartStore((s) => s.load)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const addItem = useCartStore((s) => s.addItem)

  const [itemErrors, setItemErrors] = useState<Record<number, string>>({})
  const [removed, setRemoved] = useState<Removed | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [undoPending, setUndoPending] = useState(false)
  const undoTimer = useRef<number | undefined>(undefined)
  const undoButtonRef = useRef<HTMLButtonElement>(null)
  const focusUndo = useRef(false)

  // Navegar a otra página cierra el carrito.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    if (isOpen) close()
  }

  // Si al abrir no hay datos (o falló la carga), se vuelve a pedir el carrito.
  useEffect(() => {
    if (isOpen && (status === 'idle' || status === 'error')) void load()
  }, [isOpen, status, load])

  useEffect(() => () => window.clearTimeout(undoTimer.current), [])

  // El botón de quitar desaparece con el ítem: el foco pasa a "Deshacer" (ya montado) para no perderse.
  useEffect(() => {
    if (removed && focusUndo.current) {
      focusUndo.current = false
      undoButtonRef.current?.focus()
    }
  }, [removed])

  // "Deshacer" se ofrece unos segundos; el tiempo se pausa mientras el foco o el mouse están encima.
  const startUndoTimer = useCallback(() => {
    window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => setRemoved(null), UNDO_MS)
  }, [])
  const pauseUndoTimer = useCallback(() => window.clearTimeout(undoTimer.current), [])

  const setItemError = (id: number, message: string | null) =>
    setItemErrors((prev) => {
      const next = { ...prev }
      if (message) next[id] = message
      else delete next[id]
      return next
    })

  const changeQuantity = async (item: CartItem, quantity: number) => {
    setItemError(item.id, null)
    const result = await updateQuantity(item.id, quantity)
    if (!result.ok) {
      setItemError(item.id, cartItemErrorMessage(result.error))
      if (/no exise|no se encontro/i.test(result.error)) void load()
    }
  }

  const dismissUndo = useCallback(() => {
    window.clearTimeout(undoTimer.current)
    setRemoved(null)
  }, [])

  const remove = async (item: CartItem) => {
    const label = `${item.product?.name ?? variantLabel(item.variant.name)} (${variantLabel(item.variant.name)})`
    setItemError(item.id, null)
    const result = await removeItem(item.id)
    if (!result.ok) {
      setItemError(item.id, cartItemErrorMessage(result.error))
      return
    }
    // Se quita de verdad en el backend (así los totales siguen siendo los del servidor);
    // "Deshacer" lo vuelve a agregar con la misma variante y cantidad.
    focusUndo.current = true
    setRemoved({ variantId: item.variant.id, quantity: item.quantity, label })
    setAnnouncement(`Quitaste ${label} del carrito.`)
    startUndoTimer()
  }

  const undo = async () => {
    if (!removed) return
    window.clearTimeout(undoTimer.current)
    setUndoPending(true)
    const result = await addItem(removed.variantId, removed.quantity)
    setUndoPending(false)
    if (result.ok) {
      setAnnouncement(`Volvimos a agregar ${removed.label}.`)
      setRemoved(null)
    } else {
      setAnnouncement(`No pudimos volver a agregar ${removed.label}. ${cartItemErrorMessage(result.error)}`)
      setRemoved(null)
    }
  }

  const items = cart?.items ?? []
  const hasItems = items.length > 0
  const loading = status === 'loading' && !cart
  const title = itemCount > 0 ? `Tu carrito (${itemCount})` : 'Tu carrito'

  return (
    <Drawer
      open={isOpen}
      onClose={close}
      title={title}
      returnFocusTo={returnFocusTo}
      footer={
        hasItems && summary ? (
          <div className="flex flex-col gap-4">
            <CartTotals summary={summary} couponCode={cart?.couponCode ?? null} />
            <ButtonLink to="/checkout" onClick={close} className="w-full">
              Ir a checkout
            </ButtonLink>
          </div>
        ) : undefined
      }
    >
      {/* Región viva siempre montada: anuncia quitar/deshacer. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {removed && (
        <div
          onFocus={pauseUndoTimer}
          onBlur={startUndoTimer}
          onMouseEnter={pauseUndoTimer}
          onMouseLeave={startUndoTimer}
          className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-accent-tertiary px-4 py-3 text-sm text-text-main dark:bg-dark-card dark:text-dark-text-main">
          <p className="min-w-0">Quitaste {removed.label}.</p>
          <div className="flex shrink-0 items-center gap-1">
            <Button ref={undoButtonRef} variant="secondary" loading={undoPending} onClick={() => void undo()} className="min-h-9 px-4 py-2 text-sm">
              Deshacer
            </Button>
            <button
              type="button"
              onClick={dismissUndo}
              className="rounded-full px-3 py-2 text-sm underline-offset-4 hover:underline"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {loading && <CartSkeleton />}

      {status === 'error' && !cart && (
        <ErrorState title="No pudimos cargar tu carrito" message={loadError ?? 'Probá de nuevo en un rato.'} onRetry={() => void load()} />
      )}

      {cart && !hasItems && (
        <EmptyState
          title="Tu carrito está vacío"
          message="Todavía no elegiste ninguna galleta. Hay de todas: clásicas, sin gluten, veganas…"
          action={
            <ButtonLink to="/tienda" onClick={close}>
              Ver galletas
            </ButtonLink>
          }
        />
      )}

      {hasItems && (
        <div className="flex flex-col gap-6">
          <ul aria-label="Productos en tu carrito" className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id}>
                <CartItemCard
                  item={item}
                  pending={pendingItemIds.includes(item.id)}
                  error={itemErrors[item.id] ?? null}
                  onQuantityChange={(q) => void changeQuantity(item, q)}
                  onRemove={() => void remove(item)}
                  onNavigate={close}
                />
              </li>
            ))}
          </ul>
          <CouponField appliedCode={cart?.couponCode ?? null} />
        </div>
      )}
    </Drawer>
  )
}

function CartSkeleton() {
  return (
    <>
      <p role="status" className="sr-only">
        Cargando tu carrito…
      </p>
      <div aria-hidden="true" className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-4 rounded-card bg-accent-secondary p-4 dark:bg-dark-card">
            <div className="size-20 shrink-0 rounded-card bg-text-main/10 motion-safe:animate-pulse dark:bg-dark-text-main/10" />
            <div className="flex flex-1 flex-col gap-2">
              <div className={`h-5 w-3/4 ${skeletonBar}`} />
              <div className={`h-4 w-1/3 ${skeletonBar}`} />
              <div className={`mt-2 h-9 w-28 ${skeletonBar}`} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
