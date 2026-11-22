import { expect, test, type APIRequestContext } from '@playwright/test'
import { API } from './env'

/**
 * Correos de punta a punta con Mailpit (la API con MAIL_TRANSPORT=smtp apuntando a Mailpit):
 * confirmación de pedido de invitado, enlace del correo y aviso de cambio de estado. El nombre del
 * cliente trae HTML: el correo lo tiene que mostrar como texto y no ejecutar nada.
 *
 *   MAILPIT_URL=http://127.0.0.1:8025 E2E_BASE_URL=… E2E_API_URL=… E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… \
 *     npx playwright test e2e/mail.spec.ts --project=desktop
 *
 * Sin MAILPIT_URL se saltea.
 */
const MAILPIT = process.env.MAILPIT_URL
const INJECTED = '<img src=x onerror="window.__xss=1">Ana'

interface MailpitSummary {
  ID: string
  Subject: string
}
interface MailpitMessage {
  Subject: string
  HTML: string
  Text: string
}

async function waitForMail(request: APIRequestContext, to: string, subject: RegExp): Promise<MailpitMessage> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const res = await request.get(`${MAILPIT}/api/v1/search`, { params: { query: `to:"${to}"` } })
    const { messages } = (await res.json()) as { messages: MailpitSummary[] }
    const found = messages.find((message) => subject.test(message.Subject))
    if (found) return (await (await request.get(`${MAILPIT}/api/v1/message/${found.ID}`)).json()) as MailpitMessage
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`No llegó a Mailpit un correo para ${to} con asunto ${String(subject)}`)
}

test.skip(!MAILPIT, 'Sin MAILPIT_URL: este spec es para el entorno con Mailpit.')

test('confirmación y cambio de estado llegan, se ven en claro y oscuro y no ejecutan HTML inyectado', async ({ page, request, browser }, testInfo) => {
  const email = `correo.${Date.now()}@antojarte.example`

  // Pedido de invitado con un nombre que trae HTML.
  const product = (await (await request.get(`${API}/products/seed-clasica-chips`)).json()) as { variants: { id: number }[] }
  const cart = await request.post(`${API}/cart/items`, { data: { variantId: product.variants[0]?.id, quantity: 2 } })
  const guestToken = cart.headers()['x-guest-token'] ?? ''
  const placed = await request.post(`${API}/orders`, {
    headers: { 'X-Guest-Token': guestToken },
    data: {
      guest_email: email,
      shipping_full_name: INJECTED,
      shipping_phone: '099 123 456',
      shipping_street: 'Av. 18 de Julio 1234',
      shipping_city: 'Montevideo',
      shipping_postal_code: '11200',
    },
  })
  expect(placed.status()).toBe(201)
  const { order } = (await placed.json()) as { order: { id: number } }

  // 1. Confirmación.
  const confirmation = await waitForMail(request, email, new RegExp(`Recibimos tu pedido #${order.id}`))
  expect(confirmation.HTML).toContain('&lt;img src=x onerror=&quot;window.__xss=1&quot;&gt;Ana')
  expect(confirmation.HTML).not.toContain('<img src=x')
  expect(confirmation.Text).toContain('Clásica con chips')
  const link = /https?:\/\/\S+\/pedido\/\d+#t=[\w-]+/.exec(confirmation.Text)?.[0]
  expect(link, 'enlace del pedido en el correo').toBeTruthy()

  // El HTML del correo, pintado como lo haría un cliente de correo, en claro y en oscuro.
  for (const scheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({ colorScheme: scheme, viewport: { width: 640, height: 900 } })
    const mailPage = await context.newPage()
    await mailPage.setContent(confirmation.HTML)
    await expect(mailPage.getByText(INJECTED)).toBeVisible()
    expect(await mailPage.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
    await testInfo.attach(`confirmacion-${scheme}`, { body: await mailPage.screenshot({ fullPage: true }), contentType: 'image/png' })
    await context.close()
  }

  // 2. El enlace del correo abre el pedido (el token va en el fragmento).
  const path = new URL(link ?? '').pathname + new URL(link ?? '').hash
  await page.goto(path)
  await expect(page.getByRole('heading', { level: 1, name: `Pedido #${order.id}` })).toBeVisible()
  await expect(page.getByText(INJECTED)).toBeVisible()

  // 3. Cambio de estado desde el panel → aviso por correo.
  test.skip(!process.env.E2E_ADMIN_EMAIL, 'Sin E2E_ADMIN_EMAIL no se prueba el cambio de estado.')
  const login = await request.post(`${API}/auth/login`, {
    data: { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD },
  })
  const { token } = (await login.json()) as { token: string }
  const changed = await request.patch(`${API}/admin/orders/${order.id}/status`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { status: 'canceled' },
  })
  expect(changed.ok()).toBe(true)
  const status = await waitForMail(request, email, new RegExp(`Tu pedido fue cancelado \\(#${order.id}\\)`))
  expect(status.HTML).not.toContain('<img src=x')
  expect(status.Text).toContain('enlace del correo de confirmación')
})
