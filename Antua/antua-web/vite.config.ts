/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    build: {
      // El único chunk grande es Three/R3F (~880 kB, 234 kB gzip): está aislado y solo lo baja
      // el hero de la Home. El límite queda justo encima para que cualquier otro chunk grande avise.
      chunkSizeWarningLimit: 900,
    },
    test: {
      // Unit tests (Vitest + Testing Library). El flujo completo está en e2e/ (Playwright).
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
    },
    server: {
      // La API no habilita CORS: en desarrollo el front llama a /api y Vite reenvía.
      proxy: env.VITE_API_URL
        ? {
            '/api': {
              target: env.VITE_API_URL,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ''),
            },
          }
        : undefined,
    },
  }
})
