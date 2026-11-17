import { expect, test, type Page } from '@playwright/test'

/**
 * Resiliencia: red lenta, API caída o con error 500, 404, sesión vencida a mitad del checkout y
 * carrito vacío. Ninguna pantalla queda rota: siempre hay un mensaje y un camino para seguir.
 *
 *   pnpm qa:resilience
 */
const API = 'http://localhost:3000'
// Solo las llamadas a la API (/api/ en la raíz). Un glob con "/api/" en cualquier parte también tomaría
// los módulos src/api/*.ts que sirve el servidor de desarrollo, y la app no llegaría a cargar.
const API_CALLS = /^https?:\/\/[^/]+\/api\//

test.skip(({ isMobile }) => isMobile, 'Se prueba en el proyecto desktop.')

/** Errores de JavaScript sin atrapar: una pantalla "rota" casi siempre deja uno. */
function trackErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

test('red lenta (3G rápida): la Tienda muestra el estado de carga y después los productos', async ({ page }) => {
  // El servidor de desarrollo sirve cada módulo por separado: con red lenta tarda bastante más que el build.
  test.setTimeout(120_000)
  const errors = trackErrors(page)
  const cdp = await page.context().newCDPSession(page)
  // Perfil "Fast 3G" de DevTools: 150 ms de latencia, ~1,6 Mb/s de bajada.
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 90_000 })
  await page.goto('/tienda')
  await expect(page.getByRole('heading', { level: 1, name: 'Nuestras galletas' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('link', { name: 'Clásica con chips' })).toBeVisible({ timeout: 30_000 })
  expect(errors).toEqual([])
})

test('API con error 500: estado de error con reintento, y al reintentar se recupera', async ({ page }) => {
  const errors = trackErrors(page)
  let fail = true
  await page.route('**/api/products?**', (route) =>
    fail ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"statusCode":500,"message":"Internal server error"}' }) : route.continue(),
  )
  await page.goto('/tienda')
  const alert = page.getByRole('alert')
  await expect(alert).toBeVisible()
  // El texto técnico del 500 no llega a quien compra.
  await expect(alert).not.toContainText('Internal server error')
  fail = false
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByRole('link', { name: 'Clásica con chips' })).toBeVisible()
  expect(errors).toEqual([])
})

test('API caída (sin conexión): la Ficha avisa y ofrece reintentar, sin pantalla en blanco', async ({ page }) => {
  const errors = trackErrors(page)
  await page.route(API_CALLS, (route) => route.abort('connectionrefused'))
  await page.goto('/producto/seed-clasica-chips')
  await expect(page.getByRole('alert')).toContainText('No pudimos conectarnos')
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible()
  // La Navbar y el footer siguen ahí: se puede navegar a otra parte.
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible()
  expect(errors).toEqual([])
})

test('404: ruta inexistente y producto inexistente', async ({ page }) => {
  await page.goto('/esta-pagina-no-existe')
  await expect(page.getByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver galletas' })).toBeVisible()
  await page.goto('/producto/no-existe')
  await expect(page.getByRole('heading', { level: 1, name: 'No encontramos esta galleta' })).toBeVisible()
})

test('sesión vencida a mitad del checkout: pide iniciar sesión de nuevo, sin "Unauthorized"', async ({ page, request }) => {
  const errors = trackErrors(page)
  const login = await request.post(`${API}/auth/login`, {
    data: { email: 'seed.cliente@antua.test', password: process.env.SEED_PASSWORD ?? 'SeedPass123!' },
  })
  const session = (await login.json()) as { token: string }
  const product = (await (await request.get(`${API}/products/seed-clasica-chips`)).json()) as { variants: { id: number }[] }
  await request.post(`${API}/cart/items`, {
    headers: { Authorization: `Bearer ${session.token}` },
    data: { variantId: product.variants[0]?.id, quantity: 1 },
  })
  await page.addInitScript((value) => localStorage.setItem('antua.auth', value), JSON.stringify({ state: session, version: 0 }))
  await page.goto('/checkout')
  await expect(page.getByRole('heading', { name: 'Paso 1 de 4: Dirección' })).toBeVisible()

  // A partir de acá, el servidor rechaza el JWT (venció o se cambió la contraseña en otro lado).
  await page.route(API_CALLS, (route) =>
    route.request().headers()['authorization']
      ? route.fulfill({ status: 401, contentType: 'application/json', body: '{"statusCode":401,"message":"Unauthorized"}' })
      : route.continue(),
  )
  for (const [label, value] of [
    ['Nombre y apellido', 'Cliente E2E'],
    ['Teléfono', '099 123 456'],
    ['Calle y número', 'Av. 18 de Julio 1234'],
    ['Ciudad o localidad', 'Montevideo'],
    ['Código postal', '11200'],
  ] as const) {
    const field = page.getByLabel(label)
    if (await field.count()) await field.first().fill(value)
  }
  await page.getByRole('button', { name: 'Continuar al envío' }).click()
  await page.getByRole('link', { name: 'Continuar al pago' }).click()
  // El último botón depende de si la API tiene pagos activos (igual que en guest-checkout.spec.ts).
  const { enabled } = (await (await request.get(`${API}/payments/config`)).json()) as { enabled: boolean }
  if (enabled) {
    await page.getByRole('button', { name: 'Pagar con Mercado Pago' }).click()
  } else {
    await page.getByRole('link', { name: 'Revisar y confirmar' }).click()
    await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  }

  const dialog = page.getByRole('dialog', { name: 'Iniciar sesión' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('status')).toContainText('Tu sesión venció')
  await expect(page.getByText('Unauthorized')).toHaveCount(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('antua.auth') ?? '{}').state?.token ?? null)).toBeNull()
  expect(errors).toEqual([])
})

test('carrito vacío: el drawer lo dice y el checkout lleva a la Tienda con un aviso', async ({ page }) => {
  await page.goto('/tienda')
  await page.getByRole('button', { name: /Carrito/ }).click()
  const drawer = page.getByRole('dialog', { name: /Tu carrito/ })
  await expect(drawer.getByRole('heading', { name: /vacío/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/tienda/)
  await expect(page.getByRole('status').filter({ hasText: /carrito/i })).toBeVisible()
})
