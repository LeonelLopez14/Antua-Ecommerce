export interface HeroPack {
  id: 'x1' | 'x6' | 'x12'
  count: 1 | 6 | 12
  title: string
  description: string
  /**
   * TODO(blender): .glb del paquete. Cuando exista, el hero puede pasarlo a
   * <Cookie3D modelUrl={pack.modelUrl} /> para mostrar el pack activo en 3D
   * en lugar de la ilustración de la card.
   */
  modelUrl?: string
}

/** Packs del mini carrusel del hero. Coinciden con las variantes de la API (x1, x6, x12). */
export const heroPacks: HeroPack[] = [
  {
    id: 'x1',
    count: 1,
    title: 'Una galleta',
    description: 'Para el antojo de la tarde.',
  },
  {
    id: 'x6',
    count: 6,
    title: 'Caja de 6',
    description: 'Para compartir (o no) con quien quieras.',
  },
  {
    id: 'x12',
    count: 12,
    title: 'Caja de 12',
    description: 'Para regalar o para toda la semana.',
  },
]
