import { expect, test, type Page } from '@playwright/test'

/**
 * La Content-Security-Policy del proxy (deploy/caddy/Caddyfile) no rompe nada: Three.js en la Home,
 * GSAP en el drawer y los diálogos, fuentes propias, imágenes del seed (data:) y el panel.
 *
 * Solo tiene sentido contra el despliegue (pnpm test:e2e:deploy): el servidor de desarrollo de
 * Vite no manda CSP, y en ese caso el spec se saltea.
 */

interface Problems {
  csp: string[]
  console: string[]
}

async function watch(page: Page): Promise<Problems> {
  const problems: Problems = { csp: [], console: [] }
  await page.exposeFunction('__reportCsp', (text: string) => problems.csp.push(text))
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      const report = (window as unknown as { __reportCsp: (text: string) => void }).__reportCsp
      report(`${event.violatedDirective} → ${event.blockedURI || 'inline'} (${location.pathname})`)
    })
  })
  page.on('console', (message) => {
    if (message.type() === 'error') problems.console.push(`${message.text()} (${page.url()})`)
  })
  page.on('pageerror', (error) => problems.console.push(`${error.message} (${page.url()})`))
  return problems
}

test('la CSP permite todo lo que usa el sitio y no hay errores en la consola', async ({ page, request }) => {
  const head = await request.get('/')
  const csp = head.headers()['content-security-policy']
  test.skip(!csp, 'Sin CSP (servidor de desarrollo): este spec es para el despliegue.')
  expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/)

  const problems = await watch(page)
  // El Chromium de las pruebas no tiene GPU: sin esto la Home muestra el poster. Acá se quiere
  // comprobar que Three.js funciona con la CSP, así que se fuerza la escena (marca de herramienta).
  await page.addInitScript(() => localStorage.setItem('antua.force3d', '1'))

  // Home: la escena 3D se monta cuando la página terminó de cargar (canvas de Three.js).
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Hechas para darte un gustito.' })).toBeVisible()
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 15_000 })
  // Fuentes propias (font-src 'self'): Playfair Display del h1 cargada.
  expect(await page.evaluate(() => document.fonts.check('700 16px "Playfair Display"'))).toBe(true)

  // Tienda con imágenes del seed (data:) y Ficha.
  await page.goto('/tienda')
  await page.getByRole('link', { name: 'Clásica con chips' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Clásica con chips' })).toBeVisible()

  // GSAP: drawer del carrito (animación de entrada) y AuthModal.
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  const drawer = page.getByRole('dialog', { name: /Tu carrito/ })
  await expect(drawer).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await page.getByRole('button', { name: 'Iniciar sesión o registrarte' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')

  // Institucional, 404 y el panel (pantalla de inicio de sesión: carga el chunk del panel).
  await page.goto('/preguntas-frecuentes')
  await expect(page.getByRole('heading', { level: 1, name: 'Preguntas frecuentes' })).toBeVisible()
  await page.goto('/no-existe')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.goto('/admin')
  await expect(page.getByRole('heading', { level: 1, name: 'Iniciá sesión para administrar' })).toBeVisible()

  expect(problems.csp, 'Violaciones de CSP').toEqual([])
  // Los 404 y 401 esperables (producto inexistente, sesión sin iniciar) no son errores de la app.
  const unexpected = problems.console.filter((text) => !/status of (401|404)/.test(text))
  expect(unexpected, 'Errores en la consola').toEqual([])
})
