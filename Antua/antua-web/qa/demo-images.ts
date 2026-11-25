/**
 * Ilustraciones de los productos de DEMOSTRACIÓN (`pnpm seed:demo`). Son SVG propios, dibujados
 * por este script con la paleta de DESIGN.md: no hay fotos ni material de terceros.
 *
 *   node qa/demo-images.ts            # (re)genera public/demo/productos/*.svg
 *   node qa/demo-images.ts --check    # sale con error si los archivos no coinciden con los datos
 *
 * Lee antua-api/scripts/seed-demo-data.json. El resultado es determinista (mismo dato, mismo
 * archivo), así que un cambio en el repo siempre viene de un cambio en los datos o en el dibujo.
 * Cada SVG pesa unos pocos kB y no lleva scripts, fuentes externas ni metadatos.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

type Style = 'chips' | 'chunks' | 'nuts' | 'flakes' | 'oats' | 'plain' | 'sprinkles' | 'berries' | 'box'
interface Art {
  background: string
  dough: string
  edge: string
  style: Style
  topping: string
}
interface DemoProduct {
  slug: string
  name: string
  art: Art
}

const root = dirname(fileURLToPath(import.meta.url))
const dataFile = join(root, '..', '..', 'antua-api', 'scripts', 'seed-demo-data.json')
const outDir = join(root, '..', 'public', 'demo', 'productos')

/** Colores de la marca (DESIGN.md §2): texto y acentos. */
const TEXT = '#2E2D2C'
const ACCENT = '#8D572E'
const TERTIARY = '#A8B89A'

/** Pseudoaleatorio determinista (mulberry32) sembrado con el slug: misma galleta en cada corrida. */
function random(seed: string): () => number {
  let h = 1779033703
  for (const char of seed) h = Math.imul(h ^ char.charCodeAt(0), 3432918353)
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const n = (value: number) => Math.round(value * 10) / 10

/** Puntos dentro de un círculo, sin que se encimen demasiado. */
function scatter(rand: () => number, count: number, cx: number, cy: number, radius: number, gap: number) {
  const points: [number, number][] = []
  for (let tries = 0; points.length < count && tries < count * 40; tries++) {
    const angle = rand() * Math.PI * 2
    const dist = Math.sqrt(rand()) * radius
    const x = cx + Math.cos(angle) * dist
    const y = cy + Math.sin(angle) * dist
    if (points.every(([px, py]) => (px - x) ** 2 + (py - y) ** 2 > gap * gap)) points.push([x, y])
  }
  return points
}

/** Borde irregular de la galleta: un círculo con el contorno levemente ondulado. */
function cookiePath(rand: () => number, cx: number, cy: number, r: number): string {
  const steps = 28
  const points = Array.from({ length: steps }, (_, i) => {
    const angle = (i / steps) * Math.PI * 2
    const radius = r * (0.96 + rand() * 0.06)
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]
  })
  return `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}Z`
}

function toppings(style: Style, rand: () => number, art: Art, cx: number, cy: number, r: number): string {
  const inner = r * 0.78
  switch (style) {
    case 'chips':
    case 'chunks': {
      const size = style === 'chips' ? 13 : 22
      return scatter(rand, style === 'chips' ? 16 : 9, cx, cy, inner, size * 1.9)
        .map(([x, y]) => {
          const w = size * (0.8 + rand() * 0.5)
          const rot = Math.round(rand() * 90)
          return `<rect x="${n(x - w / 2)}" y="${n(y - w / 2)}" width="${n(w)}" height="${n(w * 0.8)}" rx="${n(w * 0.3)}" fill="${art.topping}" transform="rotate(${rot} ${n(x)} ${n(y)})"/>`
        })
        .join('')
    }
    case 'nuts':
      return scatter(rand, 8, cx, cy, inner, 46)
        .map(([x, y]) => {
          const rot = Math.round(rand() * 180)
          return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="18" ry="11" fill="${art.topping}" stroke="${art.edge}" stroke-width="3" transform="rotate(${rot} ${n(x)} ${n(y)})"/>`
        })
        .join('')
    case 'flakes':
    case 'oats':
      return scatter(rand, style === 'oats' ? 22 : 30, cx, cy, inner, 22)
        .map(([x, y]) => {
          const rot = Math.round(rand() * 180)
          const w = style === 'oats' ? 16 : 12
          return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${w}" ry="${n(w * 0.45)}" fill="${art.topping}" opacity="0.9" transform="rotate(${rot} ${n(x)} ${n(y)})"/>`
        })
        .join('')
    case 'sprinkles':
      return scatter(rand, 34, cx, cy, inner, 20)
        .map(([x, y]) => {
          const rot = Math.round(rand() * 180)
          const color = [art.topping, TERTIARY, ACCENT][Math.floor(rand() * 3)]
          return `<rect x="${n(x - 8)}" y="${n(y - 2.5)}" width="16" height="5" rx="2.5" fill="${color}" transform="rotate(${rot} ${n(x)} ${n(y)})"/>`
        })
        .join('')
    case 'berries':
      return scatter(rand, 11, cx, cy, inner, 40)
        .map(([x, y]) => {
          const rot = Math.round(rand() * 360)
          return `<path d="M${n(x)} ${n(y - 13)}c9 0 14 6 12 13-3 9-9 13-12 13s-9-4-12-13c-2-7 3-13 12-13z" fill="${art.topping}" transform="rotate(${rot} ${n(x)} ${n(y)})"/><circle cx="${n(x - 3)}" cy="${n(y - 2)}" r="2" fill="#FFF2BD" transform="rotate(${rot} ${n(x)} ${n(y)})"/>`
        })
        .join('')
    case 'plain':
      // Marcas de tenedor y una pizca de canela.
      return (
        [-30, 0, 30]
          .map((dx) => `<path d="M${cx + dx - 26} ${cy - 18}h52M${cx + dx - 26} ${cy}h52M${cx + dx - 26} ${cy + 18}h52" stroke="${art.edge}" stroke-width="5" stroke-linecap="round" opacity="0.55" transform="rotate(45 ${cx + dx} ${cy})"/>`)
          .slice(1, 2)
          .join('') +
        scatter(rand, 26, cx, cy, inner, 18)
          .map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="2.6" fill="${art.topping}" opacity="0.7"/>`)
          .join('')
      )
    case 'box':
      return ''
  }
}

function cookie(rand: () => number, art: Art, cx: number, cy: number, r: number, style: Style): string {
  return [
    `<ellipse cx="${cx}" cy="${n(cy + r * 0.92)}" rx="${n(r * 0.86)}" ry="${n(r * 0.16)}" fill="${TEXT}" opacity="0.12"/>`,
    `<path d="${cookiePath(rand, cx, cy, r)}" fill="${art.edge}"/>`,
    `<path d="${cookiePath(rand, cx, cy - r * 0.03, r * 0.92)}" fill="${art.dough}"/>`,
    toppings(style, rand, art, cx, cy, r),
  ].join('')
}

/** Caja de regalo abierta con tres galletas asomando y un moño. */
function giftBox(rand: () => number, art: Art): string {
  const inner = { ...art, style: 'chips' as Style, topping: '#4A2E1C' }
  return [
    `<ellipse cx="300" cy="498" rx="210" ry="26" fill="${TEXT}" opacity="0.12"/>`,
    cookie(rand, inner, 210, 300, 78, 'chips'),
    cookie(rand, { ...inner, dough: '#6B4430', edge: '#4E3022', topping: '#C89A6A' }, 390, 292, 78, 'chunks'),
    cookie(rand, { ...inner, dough: '#EFD9A8', edge: '#D3B77F', topping: '#FFFBE9' }, 300, 262, 82, 'flakes'),
    `<path d="M110 330h380l-24 170H134z" fill="${art.topping}"/>`,
    `<path d="M110 330h380v34H110z" fill="${TEXT}" opacity="0.18"/>`,
    `<path d="M282 330h36v170h-36z" fill="#FFF2BD" opacity="0.85"/>`,
    `<path d="M300 352c-40-44-92-30-82 4 8 26 60 18 82-4zm0 0c40-44 92-30 82 4-8 26-60 18-82-4z" fill="#FFF2BD" stroke="${TEXT}" stroke-opacity="0.25" stroke-width="3"/>`,
    `<circle cx="300" cy="352" r="12" fill="#FFF2BD" stroke="${TEXT}" stroke-opacity="0.25" stroke-width="3"/>`,
  ].join('')
}

export function renderSvg(product: DemoProduct): string {
  const rand = random(product.slug)
  const { art } = product
  const drawing = art.style === 'box' ? giftBox(rand, art) : cookie(rand, art, 300, 285, 190, art.style)
  // El título accesible repite el nombre y aclara que es una ilustración de ejemplo.
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-labelledby="t">`,
    `<title id="t">${product.name}: ilustración de ejemplo</title>`,
    `<rect width="600" height="600" fill="${art.background}"/>`,
    `<circle cx="470" cy="110" r="70" fill="${TERTIARY}" opacity="0.25"/>`,
    `<circle cx="120" cy="500" r="46" fill="${ACCENT}" opacity="0.08"/>`,
    drawing,
    `<rect x="398" y="546" width="182" height="34" rx="17" fill="${TEXT}" opacity="0.72"/>`,
    `<text x="489" y="569" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" font-weight="600" fill="${art.background}">Imagen de ejemplo</text>`,
    `</svg>`,
  ].join('')
}

function main() {
  const data = JSON.parse(readFileSync(dataFile, 'utf8')) as { products: DemoProduct[] }
  const expected = new Map(data.products.map((p) => [`${p.slug}.svg`, `${renderSvg(p)}\n`]))
  mkdirSync(outDir, { recursive: true })

  if (process.argv.includes('--check')) {
    const actual = readdirSync(outDir).filter((file) => file.endsWith('.svg'))
    const stale = [...expected].filter(([file, svg]) => {
      try {
        return readFileSync(join(outDir, file), 'utf8') !== svg
      } catch {
        return true
      }
    })
    const extra = actual.filter((file) => !expected.has(file))
    if (stale.length || extra.length) {
      console.error(`Ilustraciones desactualizadas: ${[...stale.map(([f]) => f), ...extra].join(', ')}. Corré: node qa/demo-images.ts`)
      process.exit(1)
    }
    console.log(`Ilustraciones al día: ${expected.size}.`)
    return
  }

  for (const file of readdirSync(outDir)) if (!expected.has(file)) rmSync(join(outDir, file))
  let total = 0
  for (const [file, svg] of expected) {
    writeFileSync(join(outDir, file), svg)
    total += Buffer.byteLength(svg)
  }
  console.log(`${expected.size} ilustraciones en public/demo/productos (${(total / 1024).toFixed(1)} kB en total).`)
}

main()
