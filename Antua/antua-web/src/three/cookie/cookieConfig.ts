/**
 * Parámetros de la galleta 3D del hero.
 *
 * Los colores de este archivo son la ÚNICA excepción a la paleta de DESIGN.md:
 * son colores de material 3D (masa horneada, chocolate, luces) y no se usan en la UI.
 * Las medidas están en unidades de escena (1 = radio de la galleta).
 */
export interface CookieConfig {
  /** Radio de la galleta. */
  radius: number
  /** Espesor total (de la base a la cara superior, sin contar la cúpula). */
  thickness: number
  /** Radio del redondeo del borde. Debe ser menor que thickness / 2. */
  edgeRoundness: number
  /** Cuánto se abomba el centro de la cara superior. */
  dome: number
  /** Irregularidad del contorno (0 = círculo perfecto, 0.08 ≈ casera). */
  edgeNoise: number
  /** Cantidad de "ondas" del contorno. Más alto = borde más quebrado. */
  edgeNoiseFrequency: number
  /** Relieve de la superficie (grietas y bultos de la masa). */
  surfaceNoise: number
  /** Escala del relieve. Más alto = bultos más chicos y numerosos. */
  surfaceNoiseFrequency: number
  /** Resolución alrededor del eje. Más alto = contorno más suave y más triángulos. */
  radialSegments: number
  /** Resolución del perfil en la cara superior e inferior. */
  capSegments: number
  /** Cantidad de chips de chocolate (InstancedMesh: un solo draw call). */
  chipCount: number
  /** Tamaño base de cada chip. Cada uno varía ±30 %. */
  chipSize: number
  /** Distancia mínima entre chips, en múltiplos de chipSize. */
  chipSpacing: number
  /** Color de la masa en el centro. */
  doughColor: string
  /** Color de la masa en el borde y la base (más tostado). */
  doughEdgeColor: string
  /** Color de los chips. */
  chipColor: string
  /** Semilla del ruido: el mismo número genera siempre la misma galleta. */
  seed: number
  /** Inclinación fija para que se vea la cara superior (radianes). */
  tilt: number
  /** Flotación constante. */
  float: {
    /** Desplazamiento vertical máximo. */
    amplitude: number
    /** Duración de medio ciclo, en segundos. */
    duration: number
    /** Balanceo lateral máximo (radianes). */
    sway: number
  }
  /** Vueltas completas que da la galleta durante el scroll del hero. */
  scrollTurns: number
  /** Escala de la galleta cuando aparece el carrusel de packs. */
  carouselScale: number
  /** Cuánto sube la galleta cuando aparece el carrusel de packs. */
  carouselLift: number
  camera: {
    fov: number
    position: [number, number, number]
  }
  lights: {
    ambientColor: string
    ambientIntensity: number
    keyColor: string
    keyIntensity: number
    keyPosition: [number, number, number]
    fillColor: string
    fillIntensity: number
    fillPosition: [number, number, number]
  }
}

export const cookieConfig: CookieConfig = {
  radius: 1,
  thickness: 0.26,
  edgeRoundness: 0.1,
  dome: 0.05,
  edgeNoise: 0.055,
  edgeNoiseFrequency: 2.2,
  surfaceNoise: 0.022,
  surfaceNoiseFrequency: 3.5,
  radialSegments: 160,
  capSegments: 24,
  chipCount: 26,
  chipSize: 0.075,
  chipSpacing: 2.1,
  doughColor: '#D9A066',
  doughEdgeColor: '#A8642E',
  chipColor: '#3A2216',
  seed: 7,
  tilt: 0.85,
  float: {
    amplitude: 0.07,
    duration: 2.4,
    sway: 0.06,
  },
  scrollTurns: 0.5,
  carouselScale: 0.62,
  carouselLift: 0.6,
  camera: {
    fov: 32,
    position: [0, 0, 5.6],
  },
  lights: {
    ambientColor: '#FFF4E2',
    ambientIntensity: 0.9,
    keyColor: '#FFF1DC',
    keyIntensity: 2.4,
    keyPosition: [3, 4, 5],
    fillColor: '#FFE7C7',
    fillIntensity: 0.6,
    fillPosition: [-4, -1, 2],
  },
}
