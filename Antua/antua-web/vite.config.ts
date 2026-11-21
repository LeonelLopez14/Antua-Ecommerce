/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { HtmlTagDescriptor, Plugin } from 'vite'

/** Fuentes críticas (texto y h1): se precargan para que no se note el cambio de fuente. */
const CRITICAL_FONTS = [/lato-latin-400-normal-[\w-]+\.woff2$/, /playfair-display-latin-700-normal-[\w-]+\.woff2$/]

/**
 * En el build: <link rel="preload"> de las fuentes críticas (sus nombres llevan hash, por eso no
 * pueden ir fijos en index.html) y preconnect a la API si vive en otro origen.
 */
function resourceHints(apiUrl: string | undefined): Plugin {
  return {
    name: 'antua-resource-hints',
    apply: 'build',
    transformIndexHtml(_html, ctx) {
      const fonts = Object.keys(ctx.bundle ?? {}).filter((file) => CRITICAL_FONTS.some((pattern) => pattern.test(file)))
      const tags: HtmlTagDescriptor[] = fonts.map((file) => ({
        tag: 'link',
        attrs: { rel: 'preload', href: `/${file}`, as: 'font', type: 'font/woff2', crossorigin: true },
        injectTo: 'head',
      }))
      if (apiUrl && /^https?:\/\//.test(apiUrl)) {
        tags.push({ tag: 'link', attrs: { rel: 'preconnect', href: new URL(apiUrl).origin, crossorigin: true }, injectTo: 'head' })
      }
      return tags
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.API_PROXY_TARGET || (env.VITE_API_URL?.startsWith('http') ? env.VITE_API_URL : 'http://localhost:3000')
  const apiProxy = {
    '/api': {
      target,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api/, ''),
    },
  }

  return {
    plugins: [react(), tailwindcss(), resourceHints(env.VITE_API_URL)],
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
    // Desarrollo y preview reenvían /api a la API. En `qa:build` el front usa VITE_API_URL=/api, así
    // el build de producción servido con `vite preview` habla con la API por el mismo origen (como
    // detrás de un proxy), sin necesitar CORS.
    server: { proxy: apiProxy },
    preview: { proxy: apiProxy },
  }
})
