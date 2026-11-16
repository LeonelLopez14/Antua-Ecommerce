import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Trash2 } from 'lucide-react'
import { fetchAdminReviews, removeReview, setReviewHidden } from '../../api/admin'
import { getApiErrorMessage } from '../../api/client'
import { useResource } from '../../hooks/useResource'
import { usePageMeta } from '../../hooks/usePageMeta'
import { formatDateTime } from '../../lib/format'
import { toast } from '../../stores/toastStore'
import type { AdminReview } from '../../types/admin'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { LoadingRows } from '../../components/admin/LoadingRows'
import { ResultCount } from '../../components/admin/ResultCount'
import { SearchField } from '../../components/admin/SearchField'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { SelectField } from '../../components/admin/fields'
import { useAdminQuery } from '../../components/admin/useAdminQuery'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Pagination } from '../../components/shop/Pagination'

/** Moderación: ocultar es reversible y es lo recomendado; borrar es para siempre. */
export default function Reviews() {
  usePageMeta('Reseñas · Panel')
  const query = useAdminQuery()
  const { state, retry, setData } = useResource(`admin-reviews?${query.key}`, (signal) =>
    fetchAdminReviews({ q: query.get('q'), rating: query.get('rating'), hidden: query.get('hidden'), page: query.page }, signal),
  )
  const [busyId, setBusyId] = useState<number | null>(null)
  const [toDelete, setToDelete] = useState<AdminReview | null>(null)

  const toggle = async (review: AdminReview) => {
    setBusyId(review.id)
    try {
      await setReviewHidden(review.id, !review.is_hidden)
      setData((page) => ({ ...page, items: page.items.map((r) => (r.id === review.id ? { ...r, is_hidden: !r.is_hidden } : r)) }))
      toast(review.is_hidden ? 'La reseña vuelve a verse en la tienda.' : 'Reseña oculta: ya no se ve ni cuenta en el promedio.')
    } catch (error) {
      toast(getApiErrorMessage(error), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async () => {
    if (!toDelete) return
    setBusyId(toDelete.id)
    try {
      await removeReview(toDelete.id)
      setData((page) => ({ ...page, total: page.total - 1, items: page.items.filter((r) => r.id !== toDelete.id) }))
      toast('Reseña borrada.')
      setToDelete(null)
    } catch (error) {
      toast(getApiErrorMessage(error), 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <AdminPageHeader title="Reseñas" description="Ocultar es reversible: la reseña deja de verse y de contar en el promedio." />
      <div className="mb-4 grid gap-4 rounded-card bg-surface p-4 sm:grid-cols-3 dark:bg-dark-card">
        <SearchField id="buscar-resena" label="Buscar" value={query.get('q')} placeholder="Producto o comentario…" onSearch={(q) => query.set({ q })} />
        <SelectField id="estrellas-resena" label="Estrellas" value={query.get('rating')} onChange={(e) => query.set({ rating: e.target.value })}>
          <option value="">Todas</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'estrella' : 'estrellas'}
            </option>
          ))}
        </SelectField>
        <SelectField id="visibles-resena" label="Visibilidad" value={query.get('hidden')} onChange={(e) => query.set({ hidden: e.target.value })}>
          <option value="">Todas</option>
          <option value="false">Visibles</option>
          <option value="true">Ocultas</option>
        </SelectField>
      </div>
      {state.status === 'loading' && <LoadingRows label="Cargando reseñas…" />}
      {state.status === 'error' && <ErrorState headingLevel={2} title="No pudimos cargar las reseñas" message={state.message} onRetry={retry} />}
      {state.status === 'ready' && (
        <>
          <div className="mb-3">
            <ResultCount total={state.data.total} one="reseña" many="reseñas" />
          </div>
          {state.data.items.length === 0 ? (
            <EmptyState headingLevel={2} title="No hay reseñas con estos filtros" />
          ) : (
            <ul className="flex flex-col gap-3">
              {state.data.items.map((review) => (
                <li key={review.id} className="rounded-card bg-surface p-4 shadow-soft dark:bg-dark-card dark:shadow-none">
                  <article aria-labelledby={`resena-${review.id}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 id={`resena-${review.id}`} className="font-bold">
                          <Link to={`/producto/${review.product.slug}`} className="text-accent-main underline-offset-4 hover:underline dark:text-dark-accent-main">
                            {review.product.name}
                          </Link>
                        </h2>
                        <p className="text-sm text-text-main/75 dark:text-dark-text-secondary">
                          <span aria-label={`${review.rating} de 5 estrellas`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span> · {review.author.name} ·{' '}
                          {formatDateTime(review.created_at)}
                        </p>
                      </div>
                      {review.is_hidden ? <StatusBadge label="Oculta" tone="muted" /> : <StatusBadge label="Visible" tone="done" />}
                    </div>
                    <p className="mt-2 line-clamp-6 break-words">{review.comment || <em>Sin comentario.</em>}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="secondary" className="min-h-11 px-4 py-2 text-sm" loading={busyId === review.id} onClick={() => void toggle(review)}>
                        {review.is_hidden ? <Eye aria-hidden="true" className="size-4" /> : <EyeOff aria-hidden="true" className="size-4" />}
                        {review.is_hidden ? 'Mostrar' : 'Ocultar'}
                      </Button>
                      <Button variant="secondary" className="min-h-11 px-4 py-2 text-sm" onClick={() => setToDelete(review)}>
                        <Trash2 aria-hidden="true" className="size-4" />
                        Borrar
                      </Button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={state.data.page} totalPages={state.data.totalPages} hrefFor={(page) => query.hrefWith({ page: String(page) })} />
        </>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title="¿Borrar esta reseña para siempre?"
        confirmLabel="Borrar reseña"
        cancelLabel="Cancelar"
        safeFirst
        pending={busyId !== null && busyId === toDelete?.id}
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      >
        <p>No se puede deshacer. Si solo querés sacarla de la tienda, usá “Ocultar”.</p>
      </ConfirmDialog>
    </>
  )
}
