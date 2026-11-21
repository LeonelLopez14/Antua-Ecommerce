import { expect, test, type APIRequestContext } from '@playwright/test'
import { API } from './env'

/**
 * Pedido de invitado por el enlace del correo de confirmación (/pedido/:id#t=<token>).
 * Contra la API real: el token correcto muestra el pedido y uno equivocado da "No encontramos"
 * (la API responde 404 y no revela si el pedido existe).
 */
async function placeGuestOrder(request: APIRequestContext) {
  const product = (await (await request.get(`${API}/products/seed-clasica-chips`)).json()) as { variants: { id: number }[] }
  const cart = await request.post(`${API}/cart/items`, { data: { variantId: product.variants[0]?.id, quantity: 1 } })
  expect(cart.ok()).toBe(true)
  const guestToken = cart.headers()['x-guest-token'] ?? ''
  const res = await request.post(`${API}/orders`, {
    headers: { 'X-Guest-Token': guestToken },
    data: {
      guest_email: `e2e.enlace.${Date.now()}@antojarte.example`,
      shipping_full_name: 'Invitada E2E',
      shipping_phone: '099 123 456',
      shipping_street: 'Av. 18 de Julio 1234',
      shipping_city: 'Montevideo',
      shipping_postal_code: '11200',
    },
  })
  expect(res.status()).toBe(201)
  return (await res.json()) as { order: { id: number }; accessToken: string }
}

test('el enlace del correo abre el pedido del invitado, y un token equivocado no', async ({ page, request }) => {
  const { order, accessToken } = await placeGuestOrder(request)

  await page.goto(`/pedido/${order.id}#t=${accessToken}`)
  await expect(page.getByRole('heading', { level: 1, name: `Pedido #${order.id}` })).toBeVisible()
  await expect(page.getByText('Invitada E2E')).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

  await page.goto(`/pedido/${order.id}#t=${'x'.repeat(43)}`)
  await expect(page.getByRole('heading', { name: 'No encontramos ese pedido' })).toBeVisible()
  await expect(page.getByText('Invitada E2E')).toHaveCount(0)

  await page.goto(`/pedido/${order.id}`)
  await expect(page.getByRole('heading', { name: 'No encontramos ese pedido' })).toBeVisible()
})
