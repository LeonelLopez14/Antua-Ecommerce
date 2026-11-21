/**
 * Contraste WCAG 2.x de los pares de color de DESIGN.md (sección 2).
 *
 *   node qa/contrast.ts            # tabla de los pares documentados
 *   node qa/contrast.ts --check    # además, sale con error si algún borde de control baja de 3:1
 *
 * Fórmula de WCAG: luminancia relativa de cada color (sRGB linealizado) y
 * (L1 + 0,05) / (L2 + 0,05). Un color con opacidad se compone primero sobre su fondo.
 */

type Rgb = [number, number, number]

function parseHex(hex: string): Rgb {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((i) => Number.parseInt(value.slice(i, i + 2), 16)) as Rgb
}

/** Color con opacidad `alpha` (0 a 1) sobre `background`, como lo pinta el navegador. */
export function composite(foreground: string, alpha: number, background: string): Rgb {
  const fg = parseHex(foreground)
  const bg = parseHex(background)
  return fg.map((channel, i) => Math.round(channel * alpha + bg[i] * (1 - alpha))) as Rgb
}

function luminance([r, g, b]: Rgb): number {
  const linear = (channel: number) => {
    const c = channel / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

export function ratio(a: Rgb | string, b: Rgb | string): number {
  const la = luminance(typeof a === 'string' ? parseHex(a) : a)
  const lb = luminance(typeof b === 'string' ? parseHex(b) : b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

interface Pair {
  label: string
  fg: string
  alpha?: number
  bg: string
  /** Mínimo exigido: 4,5 texto normal, 3 límites de componentes (WCAG 1.4.11). */
  min: number
  control?: boolean
}

const LIGHT = { bg: '#FFFBE9', surface: '#F7F5FF', secondary: '#FFF2BD' }
const DARK = { bg: '#151515', surface: '#1E1D1C', card: '#2A2826' }

/** Tokens del borde de controles (src/index.css): --color-border-control y --color-dark-border-control. */
export const BORDER_CONTROL = '#7E8A74'
export const DARK_BORDER_CONTROL = '#8A8378'

const PAIRS: Pair[] = [
  { label: 'Borde anterior #A8B89A sobre bg', fg: '#A8B89A', bg: LIGHT.bg, min: 3 },
  { label: 'Borde de control (claro) sobre bg', fg: BORDER_CONTROL, bg: LIGHT.bg, min: 3, control: true },
  { label: 'Borde de control (claro) sobre surface', fg: BORDER_CONTROL, bg: LIGHT.surface, min: 3, control: true },
  { label: 'Borde de control (claro) sobre accent-secondary (hover)', fg: BORDER_CONTROL, bg: LIGHT.secondary, min: 3, control: true },
  { label: 'Borde anterior (oscuro) #CFC8BC al 60 % sobre dark-card', fg: '#CFC8BC', alpha: 0.6, bg: DARK.card, min: 3 },
  { label: 'Borde de control (oscuro) sobre dark-bg', fg: DARK_BORDER_CONTROL, bg: DARK.bg, min: 3, control: true },
  { label: 'Borde de control (oscuro) sobre dark-surface', fg: DARK_BORDER_CONTROL, bg: DARK.surface, min: 3, control: true },
  { label: 'Borde de control (oscuro) sobre dark-card', fg: DARK_BORDER_CONTROL, bg: DARK.card, min: 3, control: true },
  { label: 'Texto #2E2D2C sobre bg', fg: '#2E2D2C', bg: LIGHT.bg, min: 4.5 },
  { label: 'Texto #2E2D2C sobre #A8B89A (badge)', fg: '#2E2D2C', bg: '#A8B89A', min: 4.5 },
  { label: 'Texto dark-text-secondary sobre dark-card', fg: '#CFC8BC', bg: DARK.card, min: 4.5 },
]

const format = (n: number) => n.toFixed(2).replace('.', ',')

let failed = 0
console.log('| Par | Ratio | Mínimo | Resultado |')
console.log('|---|---|---|---|')
for (const pair of PAIRS) {
  const fg = pair.alpha === undefined ? pair.fg : composite(pair.fg, pair.alpha, pair.bg)
  const value = ratio(fg, pair.bg)
  const ok = value >= pair.min
  if (pair.control && !ok) failed++
  console.log(`| ${pair.label} | ${format(value)}:1 | ${format(pair.min)}:1 | ${ok ? 'Cumple' : 'No cumple'} |`)
}

if (process.argv.includes('--check') && failed > 0) {
  console.error(`${failed} borde(s) de control por debajo de 3:1`)
  process.exit(1)
}
