/** PRNG determinista (mulberry32): misma semilla, misma secuencia. */
export function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Noise2D = (x: number, y: number) => number

const smooth = (t: number): number => t * t * (3 - 2 * t)

/** Ruido de valor 2D en [0, 1], con tabla de permutación generada por la semilla. */
export function createNoise2D(seed: number): Noise2D {
  const rng = createRng(seed)
  const size = 256
  const values = new Float32Array(size)
  const perm = new Uint8Array(size * 2)
  const base = Array.from({ length: size }, (_, i) => i)

  for (let i = 0; i < size; i++) values[i] = rng()
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = base[i] ?? 0
    base[i] = base[j] ?? 0
    base[j] = tmp
  }
  for (let i = 0; i < size * 2; i++) perm[i] = base[i % size] ?? 0

  const lattice = (ix: number, iy: number): number => {
    const h = perm[(perm[ix & 255] ?? 0) + (iy & 255)] ?? 0
    return values[h] ?? 0
  }

  return (x, y) => {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const sx = smooth(x - x0)
    const sy = smooth(y - y0)
    const a = lattice(x0, y0)
    const b = lattice(x0 + 1, y0)
    const c = lattice(x0, y0 + 1)
    const d = lattice(x0 + 1, y0 + 1)
    const top = a + (b - a) * sx
    const bottom = c + (d - c) * sx
    return top + (bottom - top) * sy
  }
}

/** Suma de octavas (fractal) normalizada a [0, 1]. */
export function fbm(noise: Noise2D, x: number, y: number, octaves = 3): number {
  let sum = 0
  let amp = 1
  let freq = 1
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += noise(x * freq, y * freq) * amp
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / norm
}
