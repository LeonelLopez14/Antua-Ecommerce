import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import GuestOrder from './GuestOrder'
import { fetchGuestOrder } from '../api/orders'
import type { Order } from '../types/order'

vi.mock('../api/orders', () => ({ fetchGuestOrder: vi.fn() }))
vi.mock('../api/payments', () => ({ fetchPaymentState: vi.fn(() => Promise.resolve({ canPay: false })) }))

const TOKEN = 'a1B2c3D4e5F6g7H8i9J0k1L2'

const order: Order = {
  id: 12,
  status: 'pending',
  paymentStatus: 'pending',
  guestEmail: 'ana@antojarte.example',
  createdAt: '2026-11-20T15:00:00Z',
  shipping: { fullName: 'Ana Pérez', phone: '099', street: 'Av. 18 de Julio 1234', city: 'Montevideo', postalCode: '11200' },
  couponCode: null,
  subtotal: 700,
  discount: 0,
  shippingAmount: 150,
  shippingEtaDays: 3,
  total: 850,
  items: [{ id: 1, productName: 'Clásica con chips', unitPrice: 350, quantity: 2, variantId: 3, variantName: 'x1' }],
}

const renderAt = (url: string) =>
  render(<RouterProvider router={createMemoryRouter([{ path: '/pedido/:id', element: <GuestOrder /> }], { initialEntries: [url] })} />)

describe('GuestOrder: el pedido de un invitado por el enlace del correo', () => {
  beforeEach(() => vi.mocked(fetchGuestOrder).mockClear())

  it('con el token del fragmento muestra el pedido', async () => {
    vi.mocked(fetchGuestOrder).mockResolvedValue(order)
    renderAt(`/pedido/12#t=${TOKEN}`)
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Pedido #12' })).toBeInTheDocument()
    expect(fetchGuestOrder).toHaveBeenCalledWith(12, TOKEN, expect.anything())
  })

  it('sin token no llama a la API', () => {
    renderAt('/pedido/12')
    expect(screen.getByRole('heading', { name: 'No encontramos ese pedido' })).toBeInTheDocument()
    expect(fetchGuestOrder).not.toHaveBeenCalled()
  })

  // El token que no corresponde (404 de la API real) se prueba en e2e/guest-order.spec.ts.
})
