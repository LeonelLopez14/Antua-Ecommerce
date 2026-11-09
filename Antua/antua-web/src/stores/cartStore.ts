import { create } from 'zustand'
import * as cartApi from '../api/cart'
import { CartContractError, type CartSnapshot } from '../api/cart'
import { getApiErrorMessage } from '../api/client'
import type { Cart, CartSummary } from '../types/cart'
import { clearGuestToken, readGuestToken } from '../lib/guestToken'

type Status = 'idle' | 'loading' | 'ready' | 'error'

/** Resultado de una acción: el componente decide cómo mostrar el error (inline, toast…). */
export type CartActionResult = { ok: true } | { ok: false; error: string }

interface CartState {
  cart: Cart | null
  summary: CartSummary | null
  status: Status
  /** Error al cargar el carrito (no los de acciones puntuales, que se devuelven). */
  loadError: string | null
  /** Ítems con un PATCH/DELETE en curso. */
  pendingItemIds: number[]
  isOpen: boolean
  /** Elemento que abrió el drawer, para devolverle el foco al cerrar. */
  returnFocusTo: HTMLElement | null

  load: () => Promise<void>
  addItem: (variantId: number, quantity: number) => Promise<CartActionResult>
  updateQuantity: (itemId: number, quantity: number) => Promise<CartActionResult>
  removeItem: (itemId: number) => Promise<CartActionResult>
  applyCoupon: (code: string) => Promise<CartActionResult>
  removeCoupon: () => Promise<CartActionResult>
  /** Después de iniciar sesión: suma el carrito de invitado al del usuario (o carga el del usuario). */
  mergeGuestCart: () => Promise<CartActionResult>
  /** Después de cerrar sesión: descarta el carrito en memoria y pide uno nuevo de invitado. */
  reset: () => Promise<void>
  open: (trigger?: HTMLElement | null) => void
  close: () => void
}

const CONTRACT_MESSAGE = 'No pudimos cargar el detalle de tu carrito. Probá de nuevo en un rato.'

const errorMessage = (error: unknown): string =>
  error instanceof CartContractError ? CONTRACT_MESSAGE : getApiErrorMessage(error)

/**
 * Carrito. Regla: el estado SIEMPRE se reemplaza con lo que devuelve el backend;
 * subtotales, descuentos y totales nunca se calculan en el cliente.
 */
export const useCartStore = create<CartState>()((set, get) => {
  const replace = (snapshot: CartSnapshot) =>
    set({ cart: snapshot.cart, summary: snapshot.summary, status: 'ready', loadError: null })

  const run = async (request: () => Promise<CartSnapshot>, itemId?: number): Promise<CartActionResult> => {
    if (itemId !== undefined) set((s) => ({ pendingItemIds: [...s.pendingItemIds, itemId] }))
    try {
      replace(await request())
      return { ok: true }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    } finally {
      if (itemId !== undefined) set((s) => ({ pendingItemIds: s.pendingItemIds.filter((id) => id !== itemId) }))
    }
  }

  return {
    cart: null,
    summary: null,
    status: 'idle',
    loadError: null,
    pendingItemIds: [],
    isOpen: false,
    returnFocusTo: null,

    load: async () => {
      if (get().status === 'loading') return
      set({ status: 'loading', loadError: null })
      try {
        replace(await cartApi.fetchCart())
      } catch (error) {
        set({ status: 'error', loadError: errorMessage(error) })
      }
    },
    addItem: (variantId, quantity) => run(() => cartApi.addCartItem(variantId, quantity)),
    updateQuantity: (itemId, quantity) => run(() => cartApi.updateCartItem(itemId, quantity), itemId),
    removeItem: (itemId) => run(() => cartApi.removeCartItem(itemId), itemId),
    applyCoupon: (code) => run(() => cartApi.applyCoupon(code)),
    removeCoupon: () => run(() => cartApi.removeCoupon()),
    mergeGuestCart: async () => {
      const guestToken = readGuestToken()
      if (!guestToken) {
        await get().load()
        return { ok: true }
      }
      const result = await run(() => cartApi.mergeGuestCart(guestToken))
      if (result.ok) clearGuestToken()
      // Si el merge falla (ej.: stock), igual se muestra el carrito del usuario.
      else await get().load()
      return result
    },
    reset: async () => {
      set({ cart: null, summary: null, status: 'idle', loadError: null, pendingItemIds: [] })
      await get().load()
    },
    open: (trigger) => set({ isOpen: true, returnFocusTo: trigger ?? null }),
    close: () => set({ isOpen: false }),
  }
})

/** Cantidad total de unidades (para el badge de la Navbar). No es un monto. */
export const selectItemCount = (state: CartState): number =>
  state.cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
