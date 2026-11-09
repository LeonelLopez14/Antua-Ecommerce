import type { ReactNode } from 'react'
import { Pencil, Star, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { formatDate, formatRating } from '../../lib/format'
import type { ReviewsState } from '../../hooks/useProductDetail'
import type { Review } from '../../types/product'

interface ReviewListProps {
  state: ReviewsState
  /** Formulario para dejar una reseña (va entre el promedio y el listado). */
  form?: ReactNode
  /** Usuario con sesión: en su reseña se ofrecen las acciones. */
  ownerId?: number | null
  onEdit?: (review: Review) => void
  onDelete?: (review: Review) => void
}

function Stars({ value, className = 'size-4' }: { value: number; className?: string }) {
  // Estrellas llenas solo si el promedio se acerca (4,5 → 4 llenas; 4,8 → 5): no exagerar la puntuación.
  const filled = Math.floor(value + 0.25)
  return (
    <span aria-hidden="true" className="flex gap-0.5 text-accent-main dark:text-dark-accent-main">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`${className} ${i < filled ? 'fill-current' : 'opacity-35'}`} />
      ))}
    </span>
  )
}

const reseñas = (n: number): string => `${n} ${n === 1 ? 'reseña' : 'reseñas'}`

/** Reseñas: promedio, formulario y listado (siempre visibles, sin tabs: DESIGN.md §4). */
export function ReviewList({ state, form, ownerId = null, onEdit, onDelete }: ReviewListProps) {
  // El promedio de estrellas no es un monto: se puede calcular en el cliente.
  const average =
    state.status === 'ready' && state.reviews.length > 0
      ? state.reviews.reduce((sum, r) => sum + r.rating, 0) / state.reviews.length
      : null

  return (
    <section id="resenas" aria-labelledby="reviews-title" className="scroll-mt-6">
      <h2 id="reviews-title" tabIndex={-1} className="font-display text-3xl font-semibold">
        Reseñas
      </h2>

      {form && <div className="mt-6 max-w-2xl">{form}</div>}

      {state.status === 'loading' && (
        <div aria-hidden="true" className="mt-6 flex flex-col gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 rounded-card bg-surface motion-safe:animate-pulse dark:bg-dark-surface" />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <p className="mt-4 text-text-main/80 dark:text-dark-text-secondary">
          No pudimos cargar las reseñas. Recargá la página para volver a intentar.
        </p>
      )}

      {state.status === 'ready' && state.reviews.length === 0 && (
        <p className="mt-4 text-text-main/80 dark:text-dark-text-secondary">
          Todavía no hay reseñas. Cuando la pruebes, contanos qué te pareció.
        </p>
      )}

      {state.status === 'ready' && average !== null && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Stars value={average} className="size-5" />
            <p className="font-bold tabular-nums">
              {formatRating(average)} de 5
              <span className="font-normal text-text-main/75 dark:text-dark-text-secondary">
                {' '}
                · {reseñas(state.reviews.length)}
              </span>
            </p>
          </div>

          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {state.reviews.map((review) => {
              const date = formatDate(review.createdAt)
              return (
                <li key={review.id} className="rounded-card bg-surface p-6 dark:bg-dark-surface">
                  <article>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 truncate font-bold">{review.authorName ?? 'Cliente de Antua'}</p>
                      <div className="flex items-center gap-2">
                        <Stars value={review.rating} />
                        <span className="sr-only">{review.rating} de 5</span>
                      </div>
                    </div>
                    {date && (
                      <time dateTime={review.createdAt} className="mt-1 block text-sm text-text-main/70 dark:text-dark-text-secondary">
                        {date}
                      </time>
                    )}
                    {review.comment && <p className="mt-3 leading-relaxed wrap-break-word">{review.comment}</p>}
                    {ownerId !== null && review.authorId === ownerId && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="secondary" className="min-h-10 px-4 py-2 text-sm" onClick={() => onEdit?.(review)}>
                          <Pencil aria-hidden="true" className="size-4" />
                          Editar<span className="sr-only"> tu reseña</span>
                        </Button>
                        <Button variant="secondary" className="min-h-10 px-4 py-2 text-sm" onClick={() => onDelete?.(review)}>
                          <Trash2 aria-hidden="true" className="size-4" />
                          Borrar<span className="sr-only"> tu reseña</span>
                        </Button>
                      </div>
                    )}
                  </article>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
