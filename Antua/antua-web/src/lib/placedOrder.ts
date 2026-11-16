const KEY = 'antua.placedOrder'

/** Último pedido creado en esta pestaña. Permite recargar la confirmación sin volver a crear el pedido. */
export interface PlacedOrderRef {
  id: number
  /** Solo invitados: token para volver a ver el pedido y vincularlo a una cuenta. Dura lo que la pestaña. */
  accessToken: string | null
}

const isPlacedOrderRef = (value: unknown): value is PlacedOrderRef =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'number' &&
  'accessToken' in value &&
  (value.accessToken === null || typeof value.accessToken === 'string')

/** sessionStorage puede no existir (modo privado, storage bloqueado): nunca rompe el checkout. */
export function readPlacedOrder(): PlacedOrderRef | null {
  try {
    const raw = window.sessionStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return isPlacedOrderRef(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writePlacedOrder(ref: PlacedOrderRef): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(ref))
  } catch {
    // Sin storage, la confirmación se ve igual; solo no sobrevive a una recarga.
  }
}

export function clearPlacedOrder(): void {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // Nada que limpiar.
  }
}
