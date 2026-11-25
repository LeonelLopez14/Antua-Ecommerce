import { randomBytes } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { API } from './env'

/**
 * Compra con cuenta, de punta a punta:
 * Tienda → Ficha → agregar → checkout → iniciar sesión desde el checkout (el carrito de invitado
 * se une al de la cuenta) → dirección → envío → pago → confirmar → el pedido aparece en Mis pedidos.
 *
 * Crea un cliente propio por corrida (seed.e2e-cuenta-…@antojarte.example: `seed:clean --yes` lo borra).
 * Además falla si el navegador reporta alguna violación de la Content-Security-Policy.
 */
const RUN = `${Date.now().toString(36)}${randomBytes(2).toString('hex')}`
const CUSTOMER = { name: 'Cuenta E2E', email: `seed.e2e-cuenta-${RUN}@antojarte.example`, password: `Cuenta${randomBytes(4).toString('hex')}7` }

/** Junta las violaciones de CSP que reporta el navegador (evento securitypolicyviolation). */
async function watchCsp(page: Page): Promise<string[]> {
  const violations: string[] = []
  await page.exposeFunction('__reportCsp', (text: string) => violations.push(text))
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      const report = (window as unknown as { __reportCsp: (text: string) => void }).__reportCsp
      report(`${event.violatedDirective} → ${event.blockedURI || 'inline'}`)
    })
  })
  page.on('console', (message) => {
    if (message.type() === 'error' && /Content Security Policy/i.test(message.text())) violations.push(message.text())
  })
  return violations
}

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API}/auth/register`, {
    data: { full_name: CUSTOMER.name, email: CUSTOMER.email, password: CUSTOMER.password },
  })
  expect(res.ok()).toBe(true)
})

test('un cliente inicia sesión en el checkout, compra y ve el pedido en Mis pedidos', async ({ page }) => {
  const cspViolations = await watchCsp(page)

  // Filtrada por Clásicas: sin filtro, con los datos de demostración cargados el producto puede
  // quedar en la segunda página.
  await page.goto('/tienda?categoria=clasicas')
  await page.getByRole('link', { name: 'Clásica con chips' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Clásica con chips' })).toBeVisible()

  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  const drawer = page.getByRole('dialog', { name: /Tu carrito/ })
  await expect(drawer).toBeVisible()
  await drawer.getByRole('link', { name: 'Ir a checkout' }).click()
  await expect(page.getByRole('heading', { name: 'Paso 1 de 4: Dirección' })).toBeVisible()

  // Inicia sesión desde el checkout: el carrito de invitado pasa a la cuenta.
  await page.getByRole('button', { name: '¿Ya tenés cuenta? Iniciá sesión' }).click()
  const auth = page.getByRole('dialog')
  await auth.getByLabel('Email').fill(CUSTOMER.email)
  await auth.getByLabel('Contraseña', { exact: true }).fill(CUSTOMER.password)
  await auth.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(auth).toBeHidden()

  // Con sesión, el checkout no pide el email (es el de la cuenta).
  await expect(page.getByRole('button', { name: '¿Ya tenés cuenta? Iniciá sesión' })).toHaveCount(0)
  await expect(page.getByLabel('Email')).toHaveCount(0)

  await page.getByLabel('Nombre y apellido').fill(CUSTOMER.name)
  await page.getByLabel('Teléfono').fill('099 123 456')
  await page.getByLabel('Calle y número').fill('Av. 18 de Julio 1234')
  await page.getByLabel('Ciudad o localidad').fill('Montevideo')
  await page.getByLabel('Código postal').fill('11200')
  await page.getByRole('button', { name: 'Continuar al envío' }).click()

  await expect(page).toHaveURL(/paso=2/)
  await page.getByRole('link', { name: 'Continuar al pago' }).click()

  // En producción los pagos están deshabilitados (solo pagos de prueba): el pedido queda registrado.
  const { enabled } = (await (await page.request.get(`${API}/payments/config`)).json()) as { enabled: boolean }
  test.skip(enabled, 'Con pagos activos, el cierre se prueba en guest-checkout.spec.ts.')
  await expect(page.getByText('El pago online llega pronto')).toBeVisible()
  await page.getByRole('link', { name: 'Revisar y confirmar' }).click()
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()

  await expect(page.getByRole('heading', { level: 1, name: '¡Gracias por tu pedido!' })).toBeVisible()
  const orderNumber = (await page.getByText(/^#\d+$/).textContent())?.trim() ?? ''
  expect(orderNumber).toMatch(/^#\d+$/)

  // El pedido es de la cuenta: aparece en Mis pedidos.
  await page.goto('/cuenta/pedidos')
  // El h1 es el de la cuenta; cada sección tiene su h2.
  await expect(page.getByRole('heading', { level: 2, name: 'Mis pedidos' })).toBeVisible()
  await expect(page.getByText(`Pedido ${orderNumber}`, { exact: true })).toBeVisible()

  expect(cspViolations, 'Violaciones de Content-Security-Policy').toEqual([])
})
