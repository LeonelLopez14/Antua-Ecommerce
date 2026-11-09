import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import * as cartApi from '../api/cart'
import type { CartSnapshot } from '../api/cart'
import { useCartStore, selectItemCount } from './cartStore'
import { readGuestToken, writeGuestToken } from '../lib/guestToken'

vi.mock('../api/cart', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/cart')>()
  return {
    ...actual,
    fetchCart: vi.fn(),
    updateCartItem: vi.fn(),
    applyCoupon: vi.fn(),
    mergeGuestCart: vi.fn(),
  }
})

const snapshot = (quantity: number, total: number): CartSnapshot => ({
  cart: {
    id: 1,
    couponCode: null,
    items: [
      {
        id: 10,
        quantity,
        unitPrice: 2400,
        variant: { id: 3, name: 'x1', stock: 40 },
        product: { name: 'Clásica con chips', slug: 'clasica-chips', imageUrl: null },
      },
    ],
  },
  summary: { subtotal: total - 1500, discount: 0, shipping: 1500, total, shippingEtaDays: 3 },
  warnings: [],
})

/** Error 400 como los que devuelve NestJS: { message }. */
const apiError = (message: string) =>
  new AxiosError('Bad Request', '400', undefined, undefined, {
    status: 400,
    statusText: 'Bad Request',
    data: { message },
    headers: {},
    config: { headers: new AxiosHeaders() },
  })

describe('cartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ cart: null, summary: null, warnings: [], status: 'idle', loadError: null, pendingItemIds: [] })
  })

  it('reemplaza el estado con lo que devuelve el backend (no calcula montos)', async () => {
    vi.mocked(cartApi.fetchCart).mockResolvedValue(snapshot(2, 6300))

    await useCartStore.getState().load()

    const state = useCartStore.getState()
    expect(state.status).toBe('ready')
    expect(state.summary?.total).toBe(6300)
    expect(selectItemCount(state)).toBe(2)
  })

  it('conserva un aviso pendiente al recargar y lo borra con la próxima acción', async () => {
    const warning = { code: 'COUPON_REMOVED_MIN_NOT_MET', couponCode: 'SEED10', minAmount: 5000 } as const
    useCartStore.setState({ ...snapshot(1, 3900), warnings: [warning], status: 'ready' })

    vi.mocked(cartApi.fetchCart).mockResolvedValue(snapshot(1, 3900))
    await useCartStore.getState().load()
    expect(useCartStore.getState().warnings).toEqual([warning])

    vi.mocked(cartApi.updateCartItem).mockResolvedValue(snapshot(2, 6300))
    await useCartStore.getState().updateQuantity(10, 2)
    expect(useCartStore.getState().warnings).toEqual([])
  })

  it('marca el ítem como pendiente mientras se actualiza la cantidad', async () => {
    useCartStore.setState({ ...snapshot(1, 3900), status: 'ready' })
    let resolve: (value: CartSnapshot) => void = () => {}
    vi.mocked(cartApi.updateCartItem).mockReturnValue(new Promise((r) => (resolve = r)))

    const pending = useCartStore.getState().updateQuantity(10, 3)
    expect(useCartStore.getState().pendingItemIds).toEqual([10])

    resolve(snapshot(3, 8700))
    await expect(pending).resolves.toEqual({ ok: true })
    expect(useCartStore.getState().pendingItemIds).toEqual([])
    expect(useCartStore.getState().summary?.total).toBe(8700)
  })

  it('devuelve el error del backend y deja el carrito como estaba', async () => {
    useCartStore.setState({ ...snapshot(1, 3900), status: 'ready' })
    vi.mocked(cartApi.applyCoupon).mockRejectedValue(apiError('El cupon ha expirado o aun no vigente.'))

    const result = await useCartStore.getState().applyCoupon('VIEJO')

    expect(result).toEqual({ ok: false, error: 'El cupon ha expirado o aun no vigente.' })
    expect(useCartStore.getState().summary?.total).toBe(3900)
  })

  it('al iniciar sesión, suma el carrito de invitado y descarta su token', async () => {
    writeGuestToken('guest-123')
    vi.mocked(cartApi.mergeGuestCart).mockResolvedValue(snapshot(2, 6300))

    const result = await useCartStore.getState().mergeGuestCart()

    expect(cartApi.mergeGuestCart).toHaveBeenCalledWith('guest-123')
    expect(result.ok).toBe(true)
    expect(readGuestToken()).toBeNull()
  })

  it('sin carrito de invitado, solo carga el del usuario', async () => {
    vi.mocked(cartApi.fetchCart).mockResolvedValue(snapshot(1, 3900))

    await useCartStore.getState().mergeGuestCart()

    expect(cartApi.mergeGuestCart).not.toHaveBeenCalled()
    expect(cartApi.fetchCart).toHaveBeenCalledOnce()
  })
})
