import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type TestInfo } from '@playwright/test'

/**
 * Accesibilidad automática con axe-core: cada pantalla y estado clave en 375 y 1280 px, en claro
 * y oscuro. Falla si hay violaciones serias o críticas; las demás quedan en
 * docs/qa/axe/<estado>.json para el informe.
 *
 *   pnpm qa:a11y
 *
 * Requiere la API con los datos de prueba. Mis pedidos usa seed.cliente@antua.test; el panel,
 * QA_ADMIN_EMAIL y QA_ADMIN_PASSWORD (si faltan, se saltea). No crea pedidos: el paso 4 del
 * checkout se alcanza simulando que los pagos online están desactivados (el estado real sin credenciales).
 */
const API = 'http://localhost:3000'
const OUT = join(import.meta.dirname, '..', 'docs', 'qa', 'axe')
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

type Scheme = 'light' | 'dark'
const VIEWPORTS = [
  { name: '375', width: 375, height: 812 },
  { name: '1280', width: 1280, height: 900 },
] as const
const SCHEMES: Scheme[] = ['light', 'dark']

interface Finding {
  state: string
  id: string
  impact: string | null
  help: string
  nodes: string[]
}
const findings: Finding[] = []

let customerAuth = ''
let adminAuth = ''

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ request }) => {
  const login = async (email: string, password: string) => {
    const res = await request.post(`${API}/auth/login`, { data: { email, password } })
    expect(res.ok()).toBe(true)
    return JSON.stringify({ state: await res.json(), version: 0 })
  }
  customerAuth = await login('seed.cliente@antua.test', process.env.SEED_PASSWORD ?? 'SeedPass123!')
  if (process.env.QA_ADMIN_EMAIL && process.env.QA_ADMIN_PASSWORD) {
    adminAuth = await login(process.env.QA_ADMIN_EMAIL, process.env.QA_ADMIN_PASSWORD)
  }
})

test.afterAll(() => {
  mkdirSync(OUT, { recursive: true })
  writeFileSync(join(OUT, 'resultados.json'), JSON.stringify(findings, null, 2))
})

async function scan(page: Page, testInfo: TestInfo, state: string) {
  // Las animaciones de entrada (GSAP) terminan antes de medir contraste.
  await page.waitForTimeout(400)
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  for (const violation of results.violations) {
    findings.push({
      state,
      id: violation.id,
      impact: violation.impact ?? null,
      help: violation.help,
      nodes: violation.nodes.slice(0, 5).map((node) => node.target.join(' ')),
    })
  }
  const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  await testInfo.attach(`axe-${state}`, { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' })
  expect(
    blocking.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    `Violaciones serias o críticas en ${state}`,
  ).toEqual([])
}

async function addToCart(page: Page) {
  const product = await (await page.request.get(`${API}/products/seed-clasica-chips`)).json()
  const res = await page.request.post(`${API}/cart/items`, { data: { variantId: product.variants[0].id, quantity: 2 } })
  const token = res.headers()['x-guest-token'] ?? ''
  await page.addInitScript((value) => localStorage.setItem('antua.guestToken', value), token)
}

for (const viewport of VIEWPORTS) {
  for (const scheme of SCHEMES) {
    const label = `${viewport.name}-${scheme}`

    test.describe(label, () => {
      test.beforeEach(async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop', 'La matriz de tamaños y temas ya está acá.')
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
      })

      test('páginas públicas', async ({ page }, testInfo) => {
        const pages: [string, string, string][] = [
          ['home', '/', 'Hechas para darte un gustito.'],
          ['tienda', '/tienda', 'Nuestras galletas'],
          ['ficha', '/producto/seed-clasica-chips', 'Clásica con chips'],
          ['nosotros', '/nosotros', 'Galletas hechas para darte un gustito'],
          ['faq', '/preguntas-frecuentes', 'Preguntas frecuentes'],
          ['contacto', '/contacto', 'Contacto'],
          ['terminos', '/terminos', 'Términos y condiciones'],
          ['privacidad', '/privacidad', 'Política de privacidad'],
          ['404', '/no-existe', 'No encontramos esta página'],
          ['olvide', '/olvide-mi-contrasena', ''],
        ]
        for (const [name, path, h1] of pages) {
          await page.goto(path)
          if (h1) await expect(page.getByRole('heading', { level: 1, name: h1 })).toBeVisible()
          else await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
          await scan(page, testInfo, `${label}-${name}`)
        }
        // Una pregunta frecuente abierta.
        await page.goto('/preguntas-frecuentes')
        await page.locator('summary').first().click()
        await scan(page, testInfo, `${label}-faq-abierta`)
      })

      test('estados vacío y de error', async ({ page }, testInfo) => {
        await page.goto('/tienda?categoria=packs&max=1')
        await expect(page.getByRole('heading', { name: /No encontramos galletas|No hay/ })).toBeVisible()
        await scan(page, testInfo, `${label}-tienda-vacia`)

        await page.route('**/api/products?**', (route) => route.fulfill({ status: 500, body: '{}' }))
        await page.goto('/tienda?orden=nombre')
        await expect(page.getByRole('alert')).toBeVisible()
        await scan(page, testInfo, `${label}-tienda-error`)
        await page.unroute('**/api/products?**')

        await page.goto('/')
        await page.getByRole('button', { name: /Carrito/ }).click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await scan(page, testInfo, `${label}-carrito-vacio`)
      })

      test('carrito, AuthModal y menús', async ({ page }, testInfo) => {
        await addToCart(page)
        await page.goto('/producto/seed-clasica-chips')
        await page.getByRole('button', { name: /Carrito/ }).click()
        await expect(page.getByRole('dialog', { name: /Tu carrito/ })).toBeVisible()
        await scan(page, testInfo, `${label}-carrito-con-items`)
        await page.keyboard.press('Escape')

        await page.getByRole('button', { name: 'Iniciar sesión o registrarte' }).click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await scan(page, testInfo, `${label}-authmodal-login`)
        await page.getByRole('dialog').getByRole('tab', { name: 'Registrarme' }).click()
        await scan(page, testInfo, `${label}-authmodal-registro`)
        await page.keyboard.press('Escape')

        if (viewport.width < 768) {
          await page.getByRole('button', { name: 'Abrir menú' }).click()
          await scan(page, testInfo, `${label}-menu-movil`)
          await page.getByRole('button', { name: 'Cerrar menú' }).click()
          await page.goto('/tienda')
          await page.getByRole('button', { name: 'Filtros' }).click()
          await expect(page.getByRole('dialog')).toBeVisible()
          await scan(page, testInfo, `${label}-filtros-drawer`)
        } else {
          await page.getByRole('button', { name: 'Ayuda' }).click()
          await scan(page, testInfo, `${label}-menu-ayuda`)
        }
      })

      test('checkout, paso por paso', async ({ page }, testInfo) => {
        await addToCart(page)
        // Estado real sin credenciales de Mercado Pago: así se llega al paso 4 sin crear un pedido.
        await page.route('**/api/payments/config', (route) => route.fulfill({ json: { enabled: false } }))
        await page.goto('/checkout')
        await expect(page.getByRole('heading', { name: 'Paso 1 de 4: Dirección' })).toBeVisible()
        await page.getByRole('button', { name: 'Continuar al envío' }).click()
        await scan(page, testInfo, `${label}-checkout-1-errores`)

        await page.getByLabel('Email').fill('seed.a11y@antua.test')
        await page.getByLabel('Nombre y apellido').fill('Prueba Accesible')
        await page.getByLabel('Teléfono').fill('099 123 456')
        await page.getByLabel('Calle y número').fill('Av. 18 de Julio 1234')
        await page.getByLabel('Ciudad o localidad').fill('Montevideo')
        await page.getByLabel('Código postal').fill('11200')
        await scan(page, testInfo, `${label}-checkout-1`)

        // Salir con datos sin guardar: diálogo de confirmación.
        await page.getByRole('link', { name: /Antua/ }).first().click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await scan(page, testInfo, `${label}-checkout-salir`)
        await page.getByRole('dialog').getByRole('button', { name: /Seguir/ }).click()

        await page.getByRole('button', { name: 'Continuar al envío' }).click()
        await expect(page).toHaveURL(/paso=2/)
        await scan(page, testInfo, `${label}-checkout-2`)
        await page.getByRole('link', { name: 'Continuar al pago' }).click()
        await expect(page).toHaveURL(/paso=3/)
        await scan(page, testInfo, `${label}-checkout-3`)
        await page.getByRole('link', { name: 'Revisar y confirmar' }).click()
        await expect(page).toHaveURL(/paso=4/)
        await scan(page, testInfo, `${label}-checkout-4`)
      })

      test('cuenta con sesión', async ({ page }, testInfo) => {
        await page.addInitScript((value) => localStorage.setItem('antua.auth', value), customerAuth)
        for (const [name, path] of [
          ['pedidos', '/cuenta/pedidos'],
          ['direcciones', '/cuenta/direcciones'],
          ['perfil', '/cuenta/perfil'],
        ]) {
          await page.goto(path)
          await expect(page.getByRole('heading', { level: 1, name: 'Mi cuenta' })).toBeVisible()
          await page.waitForLoadState('networkidle')
          await scan(page, testInfo, `${label}-cuenta-${name}`)
        }
        await page.getByRole('button', { name: /Tu cuenta/ }).click()
        await scan(page, testInfo, `${label}-menu-cuenta`)
      })

      test('panel de administración', async ({ page }, testInfo) => {
        test.skip(!adminAuth, 'Sin QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD.')
        await page.addInitScript((value) => localStorage.setItem('antua.auth', value), adminAuth)
        for (const [name, path] of [
          ['resumen', '/admin'],
          ['productos', '/admin/productos'],
          ['producto', '/admin/productos/1'],
          ['cupon-nuevo', '/admin/cupones/nuevo'],
          ['pedidos', '/admin/pedidos'],
          ['resenas', '/admin/resenas'],
          ['usuarios', '/admin/usuarios'],
          ['auditoria', '/admin/auditoria'],
        ]) {
          await page.goto(path)
          await page.waitForLoadState('networkidle')
          await scan(page, testInfo, `${label}-admin-${name}`)
        }
        // Un diálogo del panel: mover stock.
        await page.goto('/admin/productos/1')
        await page.getByRole('button', { name: /Mover stock de/ }).first().click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await scan(page, testInfo, `${label}-admin-dialogo-stock`)
      })
    })
  }
}
