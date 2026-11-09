import { BufferAttribute, Color, Euler, LatheGeometry, Matrix4, Quaternion, Vector2, Vector3 } from 'three'
import type { BufferGeometry } from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createNoise2D, createRng, fbm } from './noise'
import type { CookieConfig } from './cookieConfig'

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
const smoothstep = (a: number, b: number, v: number): number => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/**
 * Perfil de un cilindro achatado con bordes redondeados, de abajo hacia arriba
 * (ese orden deja las normales hacia afuera al girarlo con LatheGeometry).
 */
function buildProfile(c: CookieConfig): Vector2[] {
  const h = c.thickness / 2
  const rr = Math.min(c.edgeRoundness, h * 0.95)
  const inner = c.radius - rr
  const arcSteps = 8
  const pts: Vector2[] = []

  for (let i = 0; i <= c.capSegments; i++) pts.push(new Vector2((inner * i) / c.capSegments, -h))
  for (let i = 1; i <= arcSteps; i++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / arcSteps)
    pts.push(new Vector2(inner + rr * Math.cos(a), -h + rr + rr * Math.sin(a)))
  }
  pts.push(new Vector2(c.radius, h - rr))
  for (let i = 1; i <= arcSteps; i++) {
    const a = (Math.PI / 2) * (i / arcSteps)
    pts.push(new Vector2(inner + rr * Math.cos(a), h - rr + rr * Math.sin(a)))
  }
  for (let i = c.capSegments - 1; i >= 0; i--) pts.push(new Vector2((inner * i) / c.capSegments, h))

  // El primer y último punto en x = 0 generan polos; un épsilon evita triángulos degenerados.
  const first = pts[0]
  const last = pts[pts.length - 1]
  if (first) first.x = 1e-4
  if (last) last.x = 1e-4
  return pts
}

export interface CookieSurface {
  /** Altura de la cara superior en (x, z), ya con cúpula y relieve. */
  topY: (x: number, z: number) => number
}

export interface CookieGeometryResult {
  dough: BufferGeometry
  chipMatrices: Matrix4[]
}

export function createCookieGeometry(c: CookieConfig): CookieGeometryResult {
  const noise = createNoise2D(c.seed)
  const h = c.thickness / 2

  const edgeFactor = (theta: number): number => {
    // Muestrear sobre un círculo hace que el ruido sea periódico (sin costura en 0/2π).
    const n = fbm(noise, Math.cos(theta) * c.edgeNoiseFrequency + 11.3, Math.sin(theta) * c.edgeNoiseFrequency + 7.1)
    return 1 + c.edgeNoise * (n * 2 - 1)
  }
  const relief = (x: number, z: number, offset: number): number =>
    fbm(noise, x * c.surfaceNoiseFrequency + offset, z * c.surfaceNoiseFrequency + offset * 0.7, 4) * 2 - 1

  const surface: CookieSurface = {
    topY: (x, z) => {
      const r2 = (x * x + z * z) / (c.radius * c.radius)
      return h + c.dome * (1 - Math.min(1, r2)) + c.surfaceNoise * relief(x, z, 31)
    },
  }

  const lathe = new LatheGeometry(buildProfile(c), c.radialSegments)
  // Sin UV ni normales, la costura del torno se puede fusionar y las normales quedan continuas.
  lathe.deleteAttribute('uv')
  lathe.deleteAttribute('normal')
  const geometry = mergeVertices(lathe, 1e-5)
  lathe.dispose()

  const pos = geometry.getAttribute('position')
  const colors = new Float32Array(pos.count * 3)
  const dough = new Color(c.doughColor)
  const edge = new Color(c.doughEdgeColor)
  const tmp = new Color()

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const r = Math.hypot(x, z)
    const theta = Math.atan2(z, x)
    const k = edgeFactor(theta)
    const nx = x * k
    const nz = z * k

    const w = clamp01(Math.abs(y) / h)
    const ny =
      y > 0 ? y + (surface.topY(nx, nz) - h) * w : y - c.surfaceNoise * 0.4 * relief(nx, nz, 57) * w

    pos.setXYZ(i, nx, ny, nz)

    // Borde y base más tostados, con algo de ruido para que no sea un degradé perfecto.
    const toast = clamp01(
      smoothstep(0.6, 1.0, r / c.radius) + (y < 0 ? 0.45 : 0) + (fbm(noise, nx * 6, nz * 6) - 0.5) * 0.35,
    )
    tmp.copy(dough).lerp(edge, toast)
    colors.set([tmp.r, tmp.g, tmp.b], i * 3)
  }

  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return { dough: geometry, chipMatrices: placeChips(c, surface) }
}

/** Reparte los chips sobre la cara superior con distancia mínima (muestreo por rechazo). */
function placeChips(c: CookieConfig, surface: CookieSurface): Matrix4[] {
  const rng = createRng(c.seed * 31 + 5)
  const placed: Vector2[] = []
  const matrices: Matrix4[] = []
  const minDist = c.chipSize * c.chipSpacing
  const maxR = (c.radius - c.edgeRoundness) * 0.92
  const euler = new Euler()
  const quat = new Quaternion()
  const scale = new Vector3()
  const position = new Vector3()

  for (let attempt = 0; attempt < c.chipCount * 40 && placed.length < c.chipCount; attempt++) {
    const r = maxR * Math.sqrt(rng())
    const theta = rng() * Math.PI * 2
    const p = new Vector2(Math.cos(theta) * r, Math.sin(theta) * r)
    if (placed.some((q) => q.distanceTo(p) < minDist)) continue
    placed.push(p)

    const size = 0.7 + rng() * 0.6
    position.set(p.x, surface.topY(p.x, p.y) - c.chipSize * 0.25, p.y)
    euler.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI)
    quat.setFromEuler(euler)
    scale.set(size, size * 0.65, size)
    matrices.push(new Matrix4().compose(position, quat, scale))
  }
  return matrices
}
