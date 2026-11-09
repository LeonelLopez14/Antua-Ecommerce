import { isAxiosError } from 'axios'
import { getApiErrorMessage } from '../api/client'

export const REVIEW_COMMENT_MAX = 1000

/** Nombre de cada calificación (se lee junto a las estrellas). */
export const RATING_LABELS = ['No me gustó', 'Regular', 'Rica', 'Muy rica', '¡Me encantó!'] as const

/**
 * Errores de POST /products/:slug/reviews (reviews.service.ts):
 * 403 sin un pedido entregado con este producto, 409 si ya la reseñaste, 404 si no está a la venta.
 */
export function reviewErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response) {
    const { status } = error.response
    if (status === 403) return 'Podés reseñar esta galleta después de recibir tu pedido.'
    if (status === 409) return 'Ya dejaste tu reseña de esta galleta. ¡Gracias!'
    if (status === 404) return 'Esta galleta ya no está a la venta, así que no se puede reseñar.'
    if (status === 401) return 'Tu sesión venció. Iniciá sesión de nuevo para publicar tu reseña.'
  }
  return getApiErrorMessage(error, 'No pudimos publicar tu reseña. Probá de nuevo en un rato.')
}
