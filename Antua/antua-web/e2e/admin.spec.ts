import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { API } from './env'

/**
 * Panel de administración de punta a punta. Requiere la API en :3000 (antua_db).
 * - Crea un admin de prueba con el script del servidor (`pnpm admin:create`), como se haría en producción.
 * - Cada corrida inicia sesión 3 veces; el login admite 10 por minuto por IP (también para admins),
 *   así que correr la suite muchas veces seguidas puede dar "Hiciste muchos intentos".
 * - Todo lo que crea usa el prefijo seed (seed.e2e-…@antua.test, seed-e2e-…, SEEDE2E…):
 *   `pnpm --filter antua-api seed:clean --yes` lo borra.
 */
// URL de la API: e2e/env.ts (por defecto, la de desarrollo).
// Único por proceso: los proyectos desktop y mobile corren en paralelo, cada uno con su admin y su cliente.
const RUN = `${Date.now().toString(36)}${randomBytes(2).toString('hex')}`
// Contra un despliegue (docker-compose.prod.yml) el admin ya existe: se crea en el servidor con
// `admin:create` y se pasa con E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD. Sin esas variables, el spec
// crea uno propio en la base de desarrollo, como siempre.
const PRESET_ADMIN = process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD
const ADMIN = PRESET_ADMIN
  ? { email: process.env.E2E_ADMIN_EMAIL ?? '', password: process.env.E2E_ADMIN_PASSWORD ?? '' }
  : { email: `seed.e2e-admin-${RUN}@antua.test`, password: `E2e${randomBytes(6).toString('hex')}9` }
const CUSTOMER = { email: `seed.e2e-cliente-${RUN}@antua.test`, password: 'ClienteE2e123' }
const SLUG = `seed-e2e-${RUN}`
const COUPON = `SEEDE2E${RUN.toUpperCase()}`

// PNG de 1×1 píxel.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ request }) => {
  if (!PRESET_ADMIN) {
    execFileSync('pnpm', ['--filter', 'antua-api', 'admin:create'], {
      cwd: '..',
      // En Windows pnpm es un .cmd, y Node solo lo ejecuta con shell. Los argumentos son fijos y la
      // contraseña va por variable de entorno, así que el shell no recibe nada externo.
      shell: process.platform === 'win32',
      env: { ...process.env, ADMIN_EMAIL: ADMIN.email, ADMIN_NAME: 'Admin E2E', ADMIN_PASSWORD: ADMIN.password },
      stdio: 'pipe',
    })
  }
  const res = await request.post(`${API}/auth/register`, {
    data: { full_name: 'Cliente E2E', email: CUSTOMER.email, password: CUSTOMER.password },
  })
  expect(res.ok()).toBe(true)
})

async function loginFromAdmin(page: Page, email: string, password: string) {
  await page.goto('/admin')
  await expect(page.getByRole('heading', { level: 1, name: 'Iniciá sesión para administrar' })).toBeVisible()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Email').fill(email)
  await dialog.getByLabel('Contraseña', { exact: true }).fill(password)
  await dialog.getByRole('button', { name: 'Iniciar sesión' }).click()
}

test('un cliente no puede entrar al panel, ni por la web ni por la API', async ({ page, request }) => {
  await loginFromAdmin(page, CUSTOMER.email, CUSTOMER.password)
  await expect(page.getByRole('heading', { level: 1, name: 'No tenés permiso' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Secciones del panel' })).toHaveCount(0)

  // El link "Administración" no aparece en su menú.
  await page.goto('/')
  await page.getByRole('button', { name: /Tu cuenta/ }).click()
  await expect(page.getByRole('link', { name: 'Administración' })).toHaveCount(0)

  // La seguridad real está en el backend: con el mismo JWT del cliente, la API responde 403.
  const token = await page.evaluate(() => (JSON.parse(localStorage.getItem('antua.auth') ?? '{}') as { state?: { token?: string } }).state?.token)
  const stats = await request.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
  expect(stats.status()).toBe(403)
})

test('un admin crea un producto con variante e imagen, un cupón, y cancela un pedido', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'El flujo completo se prueba en escritorio; el panel se revisa a 375 px aparte.')

  await loginFromAdmin(page, ADMIN.email, ADMIN.password)
  await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')

  // ---- Producto ----
  await page.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('link', { name: 'Productos' }).click()
  await page.getByRole('link', { name: 'Nuevo producto' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Nuevo producto' })).toBeVisible()
  await page.getByRole('button', { name: 'Crear producto' }).click()
  // Validación en línea: el foco va al primer error.
  await expect(page.getByLabel('Nombre', { exact: true })).toBeFocused()
  await page.getByLabel('Nombre', { exact: true }).fill(`Galleta E2E ${RUN}`)
  await page.getByLabel('Slug (URL)').fill(SLUG)
  await page.getByLabel('Descripción').fill('Galleta creada por el e2e del panel.')
  await page.getByLabel('Ingredientes').fill('Harina, manteca')
  await page.getByLabel('Alérgenos').fill('Gluten, leche')
  await page.getByRole('button', { name: 'Crear producto' }).click()
  await expect(page.getByText('Producto creado (inactivo)')).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/productos\/\d+/)
  const productId = Number(/\/admin\/productos\/(\d+)/.exec(page.url())?.[1])

  const variantForm = page.getByRole('form', { name: 'Agregar variante' })
  await variantForm.getByLabel('Precio ($U)').fill('-5')
  await variantForm.getByRole('button', { name: 'Agregar variante' }).click()
  await expect(variantForm.getByText('Precio mayor a 0')).toBeVisible()
  await variantForm.getByLabel('Precio ($U)').fill('1200')
  await variantForm.getByLabel('Stock inicial').fill('10')
  await variantForm.getByLabel('SKU').fill(`SEEDE2E-${RUN}-X1`)
  await variantForm.getByRole('button', { name: 'Agregar variante' }).click()
  await expect(page.getByText('Variante 1 galleta agregada.')).toBeVisible()

  await page.getByLabel('Nueva imagen').setInputFiles({ name: 'galleta.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByRole('img', { name: 'Vista previa de la imagen elegida' })).toBeVisible()
  await page.getByRole('button', { name: 'Subir imagen' }).click()
  await expect(page.getByText('Imagen subida.')).toBeVisible()
  await expect(page.getByText('Principal', { exact: true })).toBeVisible()
  // La imagen subida se sirve desde /uploads (en desarrollo, por el proxy /api).
  await expect.poll(() => page.getByRole('img', { name: /Imagen 1 de/ }).evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1)

  await page.getByLabel('Activo (visible en la tienda)').check()
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('Producto guardado.')).toBeVisible()
  await expect(page.getByRole('link', { name: /Ver en la tienda/ })).toBeVisible()

  // ---- Cupón ----
  await page.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('link', { name: 'Cupones' }).click()
  await page.getByRole('link', { name: 'Nuevo cupón' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Nuevo cupón' })).toBeVisible()
  await page.getByLabel('Código', { exact: true }).fill(COUPON.toLowerCase())
  await page.getByLabel('Porcentaje (1 a 100)').fill('150')
  await page.getByRole('button', { name: 'Crear cupón' }).click()
  await expect(page.getByText('El porcentaje va de 1 a 100.')).toBeVisible()
  await page.getByLabel('Porcentaje (1 a 100)').fill('10')
  await page.getByLabel('Vale hasta (inclusive)').fill('2030-12-31')
  await page.getByRole('button', { name: 'Crear cupón' }).click()
  await expect(page.getByText(`Cupón ${COUPON} creado.`)).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: COUPON })).toBeVisible()

  // ---- Pedido de un invitado (por la API pública) ----
  const product = (await (await request.get(`${API}/products/${SLUG}`)).json()) as { variants: { id: number }[] }
  const cart = await request.post(`${API}/cart/items`, { data: { variantId: product.variants[0]?.id, quantity: 2 } })
  const guestToken = cart.headers()['x-guest-token']
  const placed = await request.post(`${API}/orders`, {
    headers: { 'X-Guest-Token': guestToken ?? '' },
    data: {
      guest_email: `seed.e2e-invitado-${RUN}@antua.test`,
      shipping_full_name: 'Invitado E2E',
      shipping_phone: '099 123 456',
      shipping_street: 'Av. 18 de Julio 1234',
      shipping_city: 'Montevideo',
      shipping_postal_code: '11200',
    },
  })
  expect(placed.ok()).toBe(true)
  const { order } = (await placed.json()) as { order: { id: number } }

  await page.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('link', { name: 'Pedidos' }).click()
  await page.getByLabel('Número o email').fill(String(order.id))
  await page.getByLabel('Número o email').press('Enter')
  await page.getByRole('link', { name: `#${order.id}` }).click()
  await expect(page.getByRole('heading', { level: 1, name: `Pedido #${order.id}` })).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar pedido' }).click()
  const confirm = page.getByRole('dialog', { name: /Cancelar pedido/ })
  await confirm.getByRole('button', { name: 'Cancelar pedido' }).click()
  await expect(page.getByRole('heading', { name: 'Historial' }).locator('..')).toContainText('Pendiente → Cancelado')
  await expect(page.getByText('Este pedido ya no cambia de estado.')).toBeVisible()

  // El stock volvió (10 − 2 + 2).
  const after = (await (await request.get(`${API}/products/${SLUG}`)).json()) as { variants: { stock: number }[] }
  expect(after.variants[0]?.stock).toBe(10)

  // ---- Resumen y auditoría ----
  await page.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('link', { name: 'Resumen' }).click()
  await expect(page.getByRole('heading', { name: 'Ventas de los últimos 30 días' })).toBeVisible()
  await expect(page.getByRole('img', { name: /Ventas por día/ })).toBeVisible()
  await page.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('link', { name: 'Auditoría' }).click()
  await expect(page.getByRole('cell', { name: 'Cambió el estado de un pedido' }).first()).toBeVisible()

  // Limpieza: el producto de prueba no queda a la venta en la tienda (tiene un pedido, así que se desactiva).
  const token = await page.evaluate(() => (JSON.parse(localStorage.getItem('antua.auth') ?? '{}') as { state?: { token?: string } }).state?.token)
  const off = await request.delete(`${API}/admin/products/${productId}`, { headers: { Authorization: `Bearer ${token}` } })
  expect(await off.json()).toMatchObject({ deactivated: true })
})
