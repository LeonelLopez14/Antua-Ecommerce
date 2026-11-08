import { defineConfig, devices } from '@playwright/test'

/**
 * Flujo principal de punta a punta (e2e/). Requiere la API corriendo en :3000 con los datos
 * de prueba (productos `seed-*` y cupón SEEDFIJO). El front se levanta solo si no está corriendo.
 *
 *   pnpm test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'es-AR',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
