import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Star } from 'lucide-react'
import { postReview, updateReview } from '../../api/products'
import type { Review } from '../../types/product'
import { RATING_LABELS, REVIEW_COMMENT_MAX, reviewErrorMessage } from '../../lib/reviewMessages'
import { useAuthStore } from '../../stores/authStore'
import { useAuthModalStore } from '../../stores/authModalStore'
import { Button } from '../ui/Button'

interface ReviewFormProps {
  slug: string
  /** El usuario ya tiene una reseña en el listado: no se muestra el formulario salvo que la esté editando. */
  alreadyReviewed: boolean
  /** Reseña propia en edición. Con null, el formulario crea una nueva. */
  editing: Review | null
  /** Se llama al guardar, para recargar el listado y el promedio. */
  onSaved: (mode: 'created' | 'updated') => void
  onCancelEdit: () => void
}

/**
 * Formulario de reseña (solo con sesión). La calificación es un grupo de radios nativos
 * (teclado: flechas), con las estrellas como dibujo. También edita la reseña propia.
 */
export function ReviewForm({ slug, alreadyReviewed, editing, onSaved, onCancelEdit }: ReviewFormProps) {
  const loggedIn = useAuthStore((s) => s.token !== null)
  const openAuth = useAuthModalStore((s) => s.open)
  const baseId = useId()
  const [rating, setRating] = useState(editing?.rating ?? 0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState(editing?.comment ?? '')
  const [ratingError, setRatingError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [published, setPublished] = useState(false)
  const firstStarRef = useRef<HTMLInputElement>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const isEditing = editing !== null

  // Al pasar a editar, el foco va al formulario, que está arriba del listado.
  useEffect(() => {
    if (isEditing) commentRef.current?.focus()
  }, [isEditing])

  if (!loggedIn) {
    return (
      <div className="rounded-card bg-surface p-6 dark:bg-dark-surface">
        <p className="font-bold">¿La probaste?</p>
        <p className="mt-1 text-text-main/85 dark:text-dark-text-secondary">Iniciá sesión para dejar tu reseña después de recibir tu pedido.</p>
        <Button variant="secondary" className="mt-4" onClick={(event) => openAuth('login', event.currentTarget)}>
          Iniciar sesión
        </Button>
      </div>
    )
  }

  if (published || (alreadyReviewed && !isEditing)) {
    return (
      <p role="status" className="rounded-card bg-accent-secondary p-6 font-bold text-text-main dark:bg-dark-card dark:text-dark-text-main">
        {published ? '¡Gracias! Publicamos tu reseña.' : 'Ya dejaste tu reseña de esta galleta. ¡Gracias!'}
      </p>
    )
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    if (rating === 0) {
      setRatingError('Elegí de 1 a 5 estrellas.')
      firstStarRef.current?.focus()
      return
    }
    setPending(true)
    setFormError(null)
    try {
      if (editing) {
        await updateReview(slug, editing.id, rating, comment.trim())
        onSaved('updated')
      } else {
        await postReview(slug, rating, comment.trim())
        setPublished(true)
        onSaved('created')
      }
    } catch (error) {
      setFormError(reviewErrorMessage(error))
    } finally {
      setPending(false)
    }
  }

  const shown = hovered || rating
  const commentId = `${baseId}-comment`
  const ratingErrorId = `${baseId}-rating-error`

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-5 rounded-card bg-surface p-6 dark:bg-dark-surface">
      <h3 className="font-display text-xl font-semibold">{isEditing ? 'Editá tu reseña' : 'Dejá tu reseña'}</h3>

      <fieldset aria-describedby={ratingError ? ratingErrorId : undefined}>
        <legend className="text-sm font-bold">Tu calificación</legend>
        <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
          {RATING_LABELS.map((label, index) => {
            const value = index + 1
            return (
              <label
                key={value}
                onMouseEnter={() => setHovered(value)}
                className="flex size-11 cursor-pointer items-center justify-center rounded-full has-focus-visible:ring-2 has-focus-visible:ring-accent-main dark:has-focus-visible:ring-dark-accent-main"
              >
                <input
                  ref={value === 1 ? firstStarRef : undefined}
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => {
                    setRating(value)
                    setRatingError(null)
                  }}
                  className="sr-only"
                />
                <Star
                  aria-hidden="true"
                  className={`size-7 text-accent-main transition-transform duration-200 ease-out dark:text-dark-accent-main ${
                    value <= shown ? 'fill-current' : 'opacity-40'
                  } ${value === hovered ? 'scale-110 motion-reduce:scale-100' : ''}`}
                />
                <span className="sr-only">
                  {value} {value === 1 ? 'estrella' : 'estrellas'}: {label}
                </span>
              </label>
            )
          })}
          <span aria-hidden="true" className="ml-2 text-sm font-bold">
            {shown > 0 ? RATING_LABELS[shown - 1] : ''}
          </span>
        </div>
        {ratingError && (
          <p id={ratingErrorId} className="mt-1.5 text-sm font-bold text-accent-main dark:text-dark-accent-main">
            {ratingError}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor={commentId} className="text-sm font-bold">
          Comentario (opcional)
        </label>
        <textarea
          ref={commentRef}
          id={commentId}
          name="comment"
          autoComplete="off"
          rows={4}
          maxLength={REVIEW_COMMENT_MAX}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="¿Qué te gustó? ¿La volverías a pedir?…"
          className="mt-1 w-full resize-y rounded-xl border border-text-main/40 bg-bg px-3 py-2.5 text-base text-text-main placeholder:text-text-main/50 dark:border-dark-text-secondary/60 dark:bg-dark-bg dark:text-dark-text-main dark:placeholder:text-dark-text-secondary/70"
        />
        <p className="mt-1 text-right text-sm text-text-main/70 tabular-nums dark:text-dark-text-secondary">
          {comment.length} / {REVIEW_COMMENT_MAX}
        </p>
      </div>

      {formError && (
        <p role="alert" className="font-bold text-accent-main dark:text-dark-accent-main">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={pending}>
          {isEditing ? 'Guardar cambios' : 'Publicar reseña'}
        </Button>
        {isEditing && (
          <Button variant="secondary" onClick={onCancelEdit}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
