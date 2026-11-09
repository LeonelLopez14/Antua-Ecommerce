import { useState } from 'react'
import { deleteReview } from '../../api/products'
import { reviewErrorMessage } from '../../lib/reviewMessages'
import type { ReviewsState } from '../../hooks/useProductDetail'
import { useAuthStore } from '../../stores/authStore'
import type { Review } from '../../types/product'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ReviewForm } from './ReviewForm'
import { ReviewList } from './ReviewList'

interface ReviewsSectionProps {
  slug: string
  reviews: ReviewsState
  /** Recarga el listado y el promedio después de cualquier cambio. */
  onChanged: () => void
}

/** Reseñas de la ficha: coordina el formulario, el listado y la edición o el borrado de la propia. */
export function ReviewsSection({ slug, reviews, onChanged }: ReviewsSectionProps) {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const [editing, setEditing] = useState<Review | null>(null)
  // Se conserva al cerrar, para que el diálogo no cambie durante la animación de salida.
  const [toDelete, setToDelete] = useState<Review | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  // Al borrar, el botón que abrió el diálogo desaparece: el foco va al título de la sección.
  const [focusAfterDelete, setFocusAfterDelete] = useState<HTMLElement | null>(null)

  const alreadyReviewed = reviews.status === 'ready' && userId !== null && reviews.reviews.some((r) => r.authorId === userId)

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteReview(slug, toDelete.id)
      setFocusAfterDelete(document.getElementById('reviews-title'))
      setAnnouncement('Borramos tu reseña.')
      setEditing(null)
      onChanged()
    } catch (error) {
      setDeleteError(reviewErrorMessage(error))
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <ReviewList
        state={reviews}
        ownerId={userId}
        onEdit={setEditing}
        onDelete={(review) => {
          setToDelete(review)
          setDeleteOpen(true)
        }}
        form={
          <>
            {deleteError && (
              <p role="alert" className="mb-4 font-bold text-accent-main dark:text-dark-accent-main">
                {deleteError}
              </p>
            )}
            {/* La clave reinicia el formulario al cambiar de usuario, de modo o de estado de la reseña propia. */}
            <ReviewForm
              key={`${slug}-${userId ?? 'anon'}-${editing?.id ?? 'nueva'}-${alreadyReviewed}`}
              slug={slug}
              alreadyReviewed={alreadyReviewed}
              editing={editing}
              onCancelEdit={() => setEditing(null)}
              onSaved={(mode) => {
                setEditing(null)
                setAnnouncement(mode === 'updated' ? 'Actualizamos tu reseña.' : 'Publicamos tu reseña.')
                onChanged()
              }}
            />
          </>
        }
      />
      <ConfirmDialog
        open={deleteOpen}
        title="¿Borrás tu reseña?"
        confirmLabel="Borrar reseña"
        cancelLabel="Cancelar"
        pending={deleting}
        returnFocusTo={focusAfterDelete}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteOpen(false)}
      >
        <p>Vas a borrar tu reseña de esta galleta. Después podés escribir una nueva.</p>
      </ConfirmDialog>
    </>
  )
}
