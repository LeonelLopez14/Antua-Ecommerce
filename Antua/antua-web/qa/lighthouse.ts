/**
 * Lighthouse sobre el build de producción (`pnpm qa:build && pnpm qa:preview`), en móvil y escritorio.
 *
 *   pnpm qa:lighthouse -- --run=despues [--only=home,tienda]
 *
 * Requiere la API en :3000 con los datos de prueba. Para Mis pedidos usa seed.cliente@antua.test
 * (SEED_PASSWORD, por defecto SeedPass123!); para el panel, QA_ADMIN_EMAIL y QA_ADMIN_PASSWORD
 * (si faltan, el panel se saltea). Usa el Chromium de Playwright (o CHROME_PATH).
 *
 * Guarda los reportes JSON sin capturas en docs/qa/lighthouse/<run>/ y un resumen en
 * docs/qa/lighthouse/<run>/resumen.md. Las páginas con estado (carrito, sesión) se preparan desde
 * /robots.txt, para no precargar los archivos de la app en la caché antes de medir.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import lighthouse, { desktopConfig, type Flags, type RunnerResult } from 'lighthouse'

const BASE = process.env.QA_BASE_URL ?? 'http://localhost:4173'
const API = process.env.QA_API_URL ?? 'http://localhost:3000'
const PORT = 9333
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
const RUN = arg('run') ?? 'actual'
const ONLY = arg('only')?.split(',')
/** Corridas por página: se guarda la de rendimiento mediano (Lighthouse varía entre corridas). */
const RUNS = Math.max(1, Number(arg('runs') ?? '1'))
const OUT = join(import.meta.dirname, '..', 'docs', 'qa', 'lighthouse', RUN)

type Setup = 'none' | 'cart' | 'customer' | 'admin'
interface Target {
  key: string
  name: string
  path: string
  setup: Setup
  categories?: string[]
}

const TARGETS: Target[] = [
  { key: 'home', name: 'Home (3D)', path: '/', setup: 'none' },
  { key: 'tienda', name: 'Tienda', path: '/tienda', setup: 'none' },
  { key: 'ficha', name: 'Ficha', path: '/producto/seed-clasica-chips', setup: 'none' },
  { key: 'checkout', name: 'Checkout (con carrito)', path: '/checkout', setup: 'cart' },
  { key: 'faq', name: 'Preguntas frecuentes', path: '/preguntas-frecuentes', setup: 'none' },
  { key: '404', name: '404', path: '/no-existe', setup: 'none' },
  { key: 'pedidos', name: 'Mis pedidos (con sesión)', path: '/cuenta/pedidos', setup: 'customer' },
  { key: 'admin', name: 'Panel /admin', path: '/admin', setup: 'admin', categories: ['accessibility', 'best-practices'] },
]

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`${response.url}: ${response.status}`)
  return (await response.json()) as T
}

async function login(email: string, password: string) {
  return json<{ token: string; user: unknown }>(
    await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }),
  )
}

/** Lo que va en localStorage para cada estado. */
async function storageFor(setup: Setup): Promise<Record<string, string> | null> {
  if (setup === 'none') return null
  if (setup === 'cart') {
    const product = await json<{ variants: { id: number }[] }>(await fetch(`${API}/products/seed-clasica-chips`))
    const res = await fetch(`${API}/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId: product.variants[0]?.id, quantity: 2 }),
    })
    await json(res)
    return { 'antua.guestToken': res.headers.get('x-guest-token') ?? '' }
  }
  const credentials =
    setup === 'customer'
      ? { email: 'seed.cliente@antua.test', password: process.env.SEED_PASSWORD ?? 'SeedPass123!' }
      : { email: process.env.QA_ADMIN_EMAIL ?? '', password: process.env.QA_ADMIN_PASSWORD ?? '' }
  if (!credentials.email || !credentials.password) return null
  const session = await login(credentials.email, credentials.password)
  return { 'antua.auth': JSON.stringify({ state: session, version: 0 }) }
}

interface Row {
  page: string
  form: 'móvil' | 'escritorio'
  scores: Record<string, number | null>
  lcp: number | null
  cls: number | null
  tbt: number | null
}

const numeric = (result: RunnerResult, id: string) => result.lhr.audits[id]?.numericValue ?? null

async function main() {
  mkdirSync(OUT, { recursive: true })
  const rows: Row[] = []
  let version = '?'
  const targets = TARGETS.filter((t) => !ONLY || ONLY.includes(t.key))

  for (const form of ['móvil', 'escritorio'] as const) {
    for (const target of targets) {
      const storage = await storageFor(target.setup)
      if (target.setup !== 'none' && !storage) {
        process.stdout.write(`- ${target.name}: sin credenciales, se saltea\n`)
        continue
      }
      const results: RunnerResult[] = []
      for (let run = 0; run < RUNS; run++) {
        // Perfil nuevo por medición: caché y almacenamiento vacíos. Tiene que ser un perfil persistente:
        // con chromium.launch() + newPage(), Playwright crea un contexto aislado y Lighthouse (que abre
        // su pestaña en el contexto por defecto) no veía el carrito ni la sesión preparados.
        const profile = mkdtempSync(join(tmpdir(), 'antua-lh-'))
        const browser = await chromium.launchPersistentContext(profile, {
          executablePath: process.env.CHROME_PATH,
          args: [`--remote-debugging-port=${PORT}`],
        })
        try {
          if (storage) {
            const page = await browser.newPage()
            await page.goto(`${BASE}/robots.txt`)
            await page.evaluate((entries) => {
              for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value)
            }, storage)
            await page.close()
          }
          const flags: Flags = {
            port: PORT,
            output: 'json',
            logLevel: 'error',
            // Con estado (carrito o sesión) no se borra el almacenamiento antes de medir.
            disableStorageReset: storage !== null,
            onlyCategories: target.categories ?? ['performance', 'accessibility', 'best-practices', 'seo'],
          }
          const result = await lighthouse(`${BASE}${target.path}`, flags, form === 'escritorio' ? desktopConfig : undefined)
          if (!result) throw new Error(`Lighthouse no devolvió resultado para ${target.path}`)
          version = result.lhr.lighthouseVersion
          // Si la página redirigió (ej.: checkout sin carrito → /tienda), la medición no vale.
          const finalUrl = new URL(result.lhr.finalDisplayedUrl).pathname
          if (finalUrl !== target.path) throw new Error(`${target.name}: terminó en ${finalUrl} (¿falló la preparación del estado?)`)

          results.push(result)
        } finally {
          await browser.close()
          rmSync(profile, { recursive: true, force: true })
        }
      }
      results.sort((a, b) => (a.lhr.categories.performance?.score ?? 0) - (b.lhr.categories.performance?.score ?? 0))
      const result = results[Math.floor(results.length / 2)]
      if (!result) continue
      // Sin capturas ni metadatos (textos traducibles, tiempos internos): de ~1 MB a ~150 kB.
      const lhr: Partial<typeof result.lhr> & Pick<typeof result.lhr, 'audits'> = structuredClone(result.lhr)
      delete lhr.fullPageScreenshot
      delete lhr.i18n
      delete lhr.timing
      for (const id of ['screenshot-thumbnails', 'final-screenshot']) delete lhr.audits[id]
      writeFileSync(join(OUT, `${target.key}-${form === 'móvil' ? 'movil' : 'escritorio'}.json`), JSON.stringify(lhr))

      const scores = Object.fromEntries(
        Object.entries(result.lhr.categories).map(([id, category]) => [id, category.score === null ? null : Math.round(category.score * 100)]),
      )
      const row: Row = {
        page: target.name,
        form,
        scores,
        lcp: numeric(result, 'largest-contentful-paint'),
        cls: numeric(result, 'cumulative-layout-shift'),
        tbt: numeric(result, 'total-blocking-time'),
      }
      rows.push(row)
      process.stdout.write(
        `- ${form} ${target.name}: ${['performance', 'accessibility', 'best-practices', 'seo'].map((c) => scores[c] ?? '—').join(' / ')}\n`,
      )
    }
  }

  const fmt = (value: number | null, unit: 's' | 'ms' | '') =>
    value === null ? '—' : unit === 's' ? `${(value / 1000).toFixed(1)} s` : unit === 'ms' ? `${Math.round(value)} ms` : value.toFixed(3)
  const lines = [
    `# Lighthouse: ${RUN}`,
    '',
    `Build de producción servido con \`vite preview\` (${BASE}). Lighthouse ${version}, Chromium de Playwright. Fecha: ${new Date().toISOString().slice(0, 10)}.`,
    '',
    '| Página | Dispositivo | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS | TBT |',
    '|---|---|---|---|---|---|---|---|---|',
    ...rows.map(
      (r) =>
        `| ${r.page} | ${r.form} | ${r.scores.performance ?? '—'} | ${r.scores.accessibility ?? '—'} | ${r.scores['best-practices'] ?? '—'} | ${r.scores.seo ?? '—'} | ${fmt(r.lcp, 's')} | ${fmt(r.cls, '')} | ${fmt(r.tbt, 'ms')} |`,
    ),
    '',
  ]
  writeFileSync(join(OUT, 'resumen.md'), lines.join('\n'))
  process.stdout.write(`Resumen: ${join(OUT, 'resumen.md')}\n`)
}

await main()
