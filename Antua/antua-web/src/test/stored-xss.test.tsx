import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ReviewList } from '../components/product/ReviewList'
import type { AdminOrder } from '../types/admin'

/**
 * XSS almacenado: lo que escribe una persona (reseñas, nombres, direcciones, notas) se guarda tal
 * cual en la base y se muestra como TEXTO. React escapa todo, y el código no usa
 * dangerouslySetInnerHTML ni innerHTML (docs/seguridad.md). Los correos tienen su propio test
 * (antua-api/test/order-mails.e2e-spec.ts).
 */
const PAYLOADS = [
  '<script>window.__xss = 1</script>',
  '<img src=x onerror="window.__xss = 2">',
  '"><svg onload="window.__xss = 3">',
  'javascript:window.__xss = 4',
] as const

const sinInyeccion = (container: HTMLElement) => {
  expect(container.querySelector('script, svg[onload], img[onerror], iframe')).toBeNull()
  expect((window as { __xss?: number }).__xss).toBeUndefined()
}

describe('XSS almacenado', () => {
  it('sitio: las reseñas muestran el HTML como texto', () => {
    const reviews = PAYLOADS.map((comment, i) => ({
      id: i + 1,
      rating: 5,
      comment,
      createdAt: '2026-11-20T12:00:00.000Z',
      authorName: `${comment} autora`,
      authorId: 100 + i,
    }))
    const { container } = render(<ReviewList state={{ status: 'ready', reviews }} />)
    sinInyeccion(container)
    for (const payload of PAYLOADS) expect(screen.getByText(payload)).toBeInTheDocument()
  })

  it('panel: nombre, dirección, producto y nota interna del pedido se muestran como texto', async () => {
    const order: AdminOrder = {
      id: 7,
      created_at: '2026-11-20T12:00:00.000Z',
      status: 'pending',
      allowedTransitions: [],
      payment: { status: 'pending', expires_at: null, attempts: [] },
      contact: { email: 'cliente@antojarte.example', isGuest: true, userId: null, name: PAYLOADS[0], phone: '099' },
      shipping: { full_name: PAYLOADS[0], street: PAYLOADS[1], city: PAYLOADS[2], postal_code: '11000', eta_days: 3 },
      items: [{ id: 1, product_name: PAYLOADS[3], variant: null, unit_price: 100, quantity: 1 }],
      coupon: null,
      totals: { subtotal: 100, discount: 0, shipping: 0, total: 100 },
      internal_note: PAYLOADS[1],
      history: [],
    }
    vi.doMock('../api/admin', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../api/admin')>()),
      fetchAdminOrder: vi.fn().mockResolvedValue(order),
    }))
    const { default: OrderDetail } = await import('../pages/admin/OrderDetail')
    const { container } = render(
      <MemoryRouter initialEntries={['/admin/pedidos/7']}>
        <Routes>
          <Route path="/admin/pedidos/:id" element={<OrderDetail />} />
        </Routes>
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { name: 'Historial' })
    // Cada valor aparece literal: como texto visible o dentro del campo de la nota.
    const fields = Array.from(container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('textarea, input'))
    const visible = `${container.textContent ?? ''} ${fields.map((el) => el.value).join(' ')}`
    for (const payload of PAYLOADS) expect(visible).toContain(payload)
    sinInyeccion(container)
    vi.doUnmock('../api/admin')
  })
})
