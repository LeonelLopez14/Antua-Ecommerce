/**
 * Genera public/hero-cookie.webp: la imagen fija (poster) de la galleta 3D del hero, sacada de la
 * escena real para que el paso del poster al 3D no se note.
 *
 *   QA_BASE_URL=https://localhost:8443 QA_IGNORE_CERT_ERRORS=1 node qa/hero-poster.ts
 *
 * Volvé a generarla si cambia el modelo o las luces (three/cookie/cookieConfig.ts).
 * - Se pausa la flotación con el botón del hero: la galleta queda quieta en su pose inicial.
 * - Se recorta un cuadrado centrado (la cámara encuadra la galleta por la altura del contenedor).
 * - Fondo transparente (sirve en claro y en oscuro) y sin el texto del hero.
 * - localStorage `antua.force3d`: monta la escena aunque WebGL vaya por software (headless).
 *   Solo para esta herramienta; los visitantes nunca lo tienen.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

const BASE = process.env.QA_BASE_URL ?? 'http://localhost:5173'
const OUT = join(import.meta.dirname, '..', 'public', 'hero-cookie.webp')
const SIZE = 960

const browser = await chromium.launch()
const page = await browser.newPage({
  ignoreHTTPSErrors: process.env.QA_IGNORE_CERT_ERRORS === '1',
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
  // El estilo de abajo es en línea: la CSP del sitio lo bloquearía (bien). Solo para esta captura.
  bypassCSP: true,
})
await page.addInitScript(() => localStorage.setItem('antua.force3d', '1'))
await page.goto(`${BASE}/`)
const stage = page.locator('[data-hero-stage]')
await stage.locator('canvas').waitFor({ timeout: 20_000 })
await page.getByRole('button', { name: 'Pausar la animación de la galleta' }).click()
await page.waitForTimeout(1500)
// Todo transparente y sin texto: queda solo la galleta.
await page.addStyleTag({
  content: '*, *::before, *::after { background: transparent !important; box-shadow: none !important; } body * { visibility: hidden !important; } [data-hero-stage], [data-hero-stage] canvas { visibility: visible !important; } [data-hero-stage] button, [data-hero-stage] img { display: none !important; }',
})
const png = await stage.screenshot({ omitBackground: true })
const box = await stage.boundingBox()
if (box) {
  // Proporción para POSTER_HEIGHT_RATIO en src/components/home/HeroCookieStage.tsx.
  process.stdout.write(`POSTER_HEIGHT_RATIO = ${(Math.min(box.width, box.height) / box.height).toFixed(4)}
`)
}

// PNG → WebP con el mismo Chromium (sin dependencias nuevas), a SIZE × SIZE.
const webp = await page.evaluate(
  async ({ base64, size }) => {
    const image = new Image()
    image.src = `data:image/png;base64,${base64}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Sin contexto 2D')
    const side = Math.min(image.width, image.height)
    context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, size, size)
    return canvas.toDataURL('image/webp', 0.82).split(',')[1] ?? ''
  },
  { base64: png.toString('base64'), size: SIZE },
)
writeFileSync(OUT, Buffer.from(webp, 'base64'))
process.stdout.write(`Poster: ${OUT} (${Math.round(Buffer.from(webp, 'base64').length / 1024)} kB)\n`)
await browser.close()
