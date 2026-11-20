import { defineConfig, devices } from '@playwright/test'

/**
 * Flujo principal de punta a punta (e2e/). Requiere la API corriendo en :3000 con los datos
 * de prueba (productos `seed-*` y cupón SEEDFIJO). El front se levanta solo si no está corriendo.
 *
 *   pnpm test:e2e
 *
 * Contra el despliegue de prueba (docker-compose.prod.yml): E2E_BASE_URL apunta al proxy y no se
 * levanta el servidor de desarrollo (ver e2e/env.ts y docs/despliegue.md). Con el certificado
 * interno de Caddy hace falta E2E_IGNORE_HTTPS_ERRORS=1; el certificado se verifica aparte, con
 * la CA exportada (scripts/check-headers.sh).
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
const AGAINST_DEPLOY = process.env.E2E_BASE_URL !== undefined

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    locale: 'es-UY',
    trace: 'retain-on-failure',
    ignoreHTTPSErrors: process.env.E2E_IGNORE_HTTPS_ERRORS === '1',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    // Prueba de humo del flujo de compra en otros motores (pnpm qa:resilience). En Windows y macOS
    // WebKit funciona con `playwright install webkit`; en Linux además necesita bibliotecas del
    // sistema (`sudo pnpm exec playwright install-deps webkit`): ver docs/qa/informe-qa.md.
    { name: 'firefox', testMatch: /guest-checkout\.spec\.ts/, use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 900 } } },
    { name: 'webkit', testMatch: /guest-checkout\.spec\.ts/, use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: AGAINST_DEPLOY
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 60_000,
      },
})
