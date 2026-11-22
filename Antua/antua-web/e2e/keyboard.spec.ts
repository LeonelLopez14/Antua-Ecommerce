import { chromium, expect, test, type Page } from '@playwright/test'
import { API } from './env'

/**
 * Accesibilidad que axe no mide: teclado, foco, zoom, movimiento reducido, tema y sin WebGL.
 * Es la parte automatizable del recorrido de docs/qa/accesibilidad-manual.md.
 *
 *   pnpm qa:keyboard
 */
// URL de la API: e2e/env.ts (por defecto, la de desarrollo).

test.describe.configure({ mode: 'serial' })
// Se prueba con teclado en escritorio (el proyecto mobile emula táctil); el tamaño se varía en cada test.
test.skip(({ isMobile }) => isMobile, 'Teclado: solo en el proyecto desktop.')

const active = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement
    return el ? `${el.tagName.toLowerCase()}|${el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 40) ?? ''}` : 'none'
  })
const focusInside = (page: Page, selector: string) =>
  page.evaluate((sel) => !!document.activeElement && !!document.querySelector(sel)?.contains(document.activeElement), selector)

async function withCart(page: Page) {
  const product = await (await page.request.get(`${API}/products/seed-clasica-chips`)).json()
  const res = await page.request.post(`${API}/cart/items`, { data: { variantId: product.variants[0].id, quantity: 1 } })
  const token = res.headers()['x-guest-token'] ?? ''
  await page.addInitScript((value) => localStorage.setItem('antua.guestToken', value), token)
}

test('skip link: es lo primero que se enfoca y lleva al contenido', async ({ page }) => {
  await page.goto('/tienda')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.keyboard.press('Tab')
  expect(await active(page)).toBe('a|Saltar al contenido principal')
  await expect(page.getByRole('link', { name: 'Saltar al contenido principal' })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#contenido$/)
  // El siguiente Tab ya está dentro de <main>, sin pasar de nuevo por la Navbar.
  await page.keyboard.press('Tab')
  expect(await focusInside(page, 'main')).toBe(true)
})

test('drawer del carrito: foco atrapado, Escape cierra y el foco vuelve al botón', async ({ page }) => {
  await withCart(page)
  await page.goto('/tienda')
  const cartButton = page.getByRole('button', { name: /Carrito/ })
  await cartButton.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: /Tu carrito/ })
  await expect(dialog).toBeVisible()
  expect(await focusInside(page, '[role="dialog"]')).toBe(true)
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab')
    expect(await focusInside(page, '[role="dialog"]')).toBe(true)
  }
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Shift+Tab')
    expect(await focusInside(page, '[role="dialog"]')).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(cartButton).toBeFocused()
})

test('AuthModal: foco atrapado, tabs con flechas, Escape y devolución del foco', async ({ page }) => {
  await page.goto('/')
  const account = page.getByRole('button', { name: 'Iniciar sesión o registrarte' })
  await account.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab')
    expect(await focusInside(page, '[role="dialog"]')).toBe(true)
  }
  await dialog.getByRole('tab', { name: 'Iniciar sesión' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(dialog.getByRole('tab', { name: 'Registrarme' })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(account).toBeFocused()
})

test('checkout completo solo con teclado, con el foco en el título de cada paso', async ({ page }) => {
  await withCart(page)
  await page.route('**/api/payments/config', (route) => route.fulfill({ json: { enabled: false } }))
  await page.goto('/checkout')
  await expect(page.getByRole('heading', { name: 'Paso 1 de 4: Dirección' })).toBeVisible()

  // Enviar vacío con Enter: el foco va al primer campo con error.
  await page.getByLabel('Email').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Email')).toBeFocused()
  await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')

  const fields: [string, string][] = [
    ['Email', 'seed.teclado@antua.test'],
    ['Nombre y apellido', 'Prueba Teclado'],
    ['Teléfono', '099 123 456'],
    ['Calle y número', 'Av. 18 de Julio 1234'],
    ['Ciudad o localidad', 'Montevideo'],
    ['Código postal', '11200'],
  ]
  for (const [label, value] of fields) {
    await page.getByLabel(label).focus()
    await page.keyboard.type(value)
  }
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/paso=2/)
  await expect(page.locator('#paso-title')).toBeFocused()

  for (const [link, step] of [
    ['Continuar al pago', 3],
    ['Revisar y confirmar', 4],
  ] as const) {
    // Tab hasta el link (sin mouse) y Enter.
    for (let i = 0; i < 40 && !(await page.getByRole('link', { name: link }).evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab')
    }
    await expect(page.getByRole('link', { name: link })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(`paso=${step}`))
    await expect(page.locator('#paso-title')).toBeFocused()
  }
  // El botón final se alcanza con Tab (no se confirma, para no crear un pedido).
  for (let i = 0; i < 40 && (await active(page)) !== 'button|Confirmar pedido'; i++) await page.keyboard.press('Tab')
  expect(await active(page)).toBe('button|Confirmar pedido')
})

test('foco visible en los controles (outline de 2 px con el acento)', async ({ page }) => {
  await page.goto('/tienda')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  const outline = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement as Element)
    return `${style.outlineStyle} ${style.outlineWidth}`
  })
  expect(outline).toBe('solid 2px')
})

test('zoom al 200 % y texto agrandado: sin scroll horizontal ni contenido cortado', async ({ page }) => {
  // 1280 px al 200 % = 640 px de ancho útil; WCAG 1.4.10 pide que funcione en 320 px.
  for (const width of [640, 320]) {
    await page.setViewportSize({ width, height: 800 })
    for (const path of ['/', '/tienda', '/producto/seed-clasica-chips', '/preguntas-frecuentes', '/terminos', '/checkout']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect({ width, path, overflow }).toEqual({ width, path, overflow: 0 })
    }
  }
  // Texto al 200 %: la preferencia de tamaño de letra del navegador (32 px en vez de 16 px), por CDP.
  // No alcanza con poner font-size en <html>: las media queries en rem usan el tamaño por defecto del
  // navegador, y con la preferencia real los breakpoints también se agrandan (a 1280 px, diseño móvil).
  await page.setViewportSize({ width: 1280, height: 900 })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: 32, fixed: 26 } })
  for (const path of ['/', '/tienda', '/producto/seed-clasica-chips', '/contacto', '/terminos', '/checkout']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect({ path, overflow }).toEqual({ path, overflow: 0 })
    // Visible y sin recortar (en la Ficha, con diseño móvil, la galería va antes que el título).
    const h1 = page.getByRole('heading', { level: 1 })
    await h1.scrollIntoViewIfNeeded()
    await expect(h1).toBeInViewport({ ratio: 1 })
  }
})

test('prefers-reduced-motion: sin pin del hero ni flotación', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('.pin-spacer')).toHaveCount(1)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('.pin-spacer')).toHaveCount(0)
  // Con movimiento reducido, solo el poster: la escena 3D (y su chunk) no se carga.
  await page.waitForTimeout(2500)
  await expect(page.locator('[data-hero-stage] canvas')).toHaveCount(0)
  await expect(page.locator('[data-hero-stage] img')).toBeVisible()
})

test('prefers-color-scheme: oscuro aplica color-scheme y theme-color', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark')
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(21, 21, 21)')
})

test('Home sin WebGL: se ve el poster de la galleta, sin errores', async ({ baseURL }) => {
  const browser = await chromium.launch({ args: ['--disable-3d-apis', '--disable-webgl'] })
  const page = await browser.newPage()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${baseURL}/`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForTimeout(2500)
  expect(await page.locator('canvas').count()).toBe(0)
  // El poster cargó de verdad (no una imagen rota) y no hay botón de pausa (no hay animación).
  const poster = page.locator('[data-hero-stage] img')
  await expect(poster).toBeVisible()
  expect(await poster.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  await expect(page.getByRole('button', { name: /animación de la galleta/ })).toHaveCount(0)
  expect(errors).toEqual([])
  await browser.close()
})

test('panel: navegación con teclado y diálogo con Escape', async ({ page, request }) => {
  test.skip(!process.env.QA_ADMIN_EMAIL || !process.env.QA_ADMIN_PASSWORD, 'Sin QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD.')
  const res = await request.post(`${API}/auth/login`, { data: { email: process.env.QA_ADMIN_EMAIL, password: process.env.QA_ADMIN_PASSWORD } })
  const session = JSON.stringify({ state: await res.json(), version: 0 })
  await page.addInitScript((value) => localStorage.setItem('antua.auth', value), session)
  await page.goto('/admin')
  // El panel es un chunk diferido: esperar a que esté antes de usar el teclado.
  await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible()
  await page.keyboard.press('Tab')
  expect(await active(page)).toBe('a|Saltar al contenido principal')
  const products = page.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('link', { name: 'Productos' })
  await products.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible()
  await page.goto('/admin/productos/1')
  const trigger = page.getByRole('button', { name: /Mover stock de/ }).first()
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await focusInside(page, '[role="dialog"]')).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(trigger).toBeFocused()
})
