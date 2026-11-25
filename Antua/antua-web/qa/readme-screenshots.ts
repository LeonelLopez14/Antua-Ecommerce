/**
 * Capturas de los README (docs/media/*.jpg) con Playwright, a 1280 px.
 *
 *   QA_BASE_URL=http://localhost:5173 \
 *   QA_ADMIN_EMAIL=demo.admin@antojarte.example QA_ADMIN_PASSWORD='…' \
 *   node qa/readme-screenshots.ts
 *
 * Necesita la tienda corriendo con los datos de demostración (`DEMO_PASSWORD=… DEMO_ADMIN_PASSWORD=…
 * pnpm seed:demo`). Sin las variables del admin, saltea la captura del panel.
 * Las capturas son de la app real: no se retoca nada. JPEG con calidad 80, ~100 kB cada una.
 */
import { mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Page } from '@playwright/test'

const base = (process.env.QA_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'media')
const PRODUCT = 'demo-clasica-chips'

async function shot(page: Page, name: string) {
  // Sin animaciones ni cursor parpadeando: la captura es estable.
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)
  const path = join(outDir, `${name}.jpg`)
  await page.screenshot({ path, type: 'jpeg', quality: 80 })
  console.log(`${name}.jpg  ${(statSync(path).size / 1024).toFixed(0)} kB`)
}

async function main() {
  mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    locale: 'es-UY',
  })
  const page = await context.newPage()

  await page.goto(`${base}/`)
  await shot(page, 'home')

  await page.goto(`${base}/tienda`)
  await page.getByRole('link', { name: /Chips de chocolate/ }).first().waitFor()
  await shot(page, 'tienda')

  await page.goto(`${base}/producto/${PRODUCT}`)
  await page.getByRole('heading', { level: 1, name: 'Chips de chocolate' }).waitFor()
  await shot(page, 'ficha')

  // Carrito: se agrega desde la ficha, que abre el drawer.
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await page.getByRole('dialog').waitFor()
  await shot(page, 'carrito')

  await page.goto(`${base}/checkout`)
  await page.getByRole('heading', { level: 1 }).waitFor()
  await shot(page, 'checkout')

  // Modo oscuro, en la ficha (se ven la paleta, el precio y las reseñas).
  await page.evaluate(() => localStorage.setItem('antua.theme', 'dark'))
  await page.goto(`${base}/producto/${PRODUCT}`)
  await page.getByRole('heading', { level: 1, name: 'Chips de chocolate' }).waitFor()
  await shot(page, 'oscuro')
  await page.evaluate(() => localStorage.removeItem('antua.theme'))

  const email = process.env.QA_ADMIN_EMAIL
  const password = process.env.QA_ADMIN_PASSWORD
  if (email && password) {
    // Sesión iniciada por la API, como lo hace el AuthModal.
    const res = await page.request.post(`${base}/api/auth/login`, { data: { email, password } })
    if (!res.ok()) throw new Error(`No se pudo iniciar sesión como admin (${res.status()}).`)
    const session = (await res.json()) as { token: string; user: unknown }
    await page.evaluate(
      (value) => localStorage.setItem('antua.auth', JSON.stringify({ state: value, version: 0 })),
      session,
    )
    // La lista de productos: con los datos de demostración no hay pedidos, y el resumen saldría en cero.
    await page.goto(`${base}/admin/productos`)
    await page.getByRole('heading', { level: 1 }).waitFor()
    await page.getByText('Chips de chocolate').first().waitFor()
    await shot(page, 'panel')
  } else {
    console.log('panel: falta QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD, se saltea')
  }

  await browser.close()
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
