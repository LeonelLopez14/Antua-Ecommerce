import { useEffect, useId, useMemo, useState, type ChangeEvent } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2 } from 'lucide-react'
import { removeImage, reorderImages, setPrimaryImage, uploadImage } from '../../../api/admin'
import { getApiErrorMessage } from '../../../api/client'
import { toast } from '../../../stores/toastStore'
import type { AdminImage, AdminProduct } from '../../../types/admin'
import { Button } from '../../ui/Button'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { iconButtonClasses } from '../../ui/buttonStyles'
import { StatusBadge } from '../StatusBadge'

const MAX_BYTES = 2 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGES = 10

interface ImagesSectionProps {
  product: AdminProduct
  onUpdated: (product: AdminProduct) => void
}

/**
 * Imágenes: vista previa antes de subir, principal, orden y borrado con confirmación.
 * El front revisa tipo y tamaño para avisar rápido; el servidor revisa el contenido real.
 */
export function ImagesSection({ product, onUpdated }: ImagesSectionProps) {
  const inputId = useId()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [toDelete, setToDelete] = useState<AdminImage | null>(null)

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null
    setError(null)
    if (chosen && !ACCEPTED.includes(chosen.type)) {
      setError('Elegí una imagen JPEG, PNG o WebP.')
      setFile(null)
      return
    }
    if (chosen && chosen.size > MAX_BYTES) {
      setError('La imagen pesa más de 2 MB. Achicala o exportala en WebP.')
      setFile(null)
      return
    }
    setFile(chosen)
  }

  const run = async (action: () => Promise<AdminProduct>, success: string) => {
    setBusy(true)
    try {
      onUpdated(await action())
      toast(success)
      return true
    } catch (err) {
      toast(getApiErrorMessage(err), 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  const upload = async () => {
    if (!file) {
      setError('Elegí una imagen primero.')
      document.getElementById(inputId)?.focus()
      return
    }
    setBusy(true)
    setError(null)
    try {
      onUpdated(await uploadImage(product.id, file))
      toast('Imagen subida.')
      setFile(null)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const move = (index: number, offset: -1 | 1) => {
    const ids = product.images.map((image) => image.id)
    const [moved] = ids.splice(index, 1)
    if (moved === undefined) return
    ids.splice(index + offset, 0, moved)
    void run(() => reorderImages(product.id, ids), 'Orden de las imágenes guardado.')
  }

  const full = product.images.length >= MAX_IMAGES

  return (
    <div className="flex flex-col gap-6">
      {product.images.length === 0 ? (
        <p className="rounded-xl bg-accent-secondary px-4 py-3 dark:bg-dark-bg">Sin imágenes: en la tienda se muestra una ilustración.</p>
      ) : (
        <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {product.images.map((image, index) => (
            <li key={image.id} className="flex flex-col gap-3 rounded-card bg-bg p-3 dark:bg-dark-bg">
              <img src={image.url} alt={`Imagen ${index + 1} de ${product.name}`} width={320} height={320} loading="lazy" className="aspect-square w-full rounded-card object-cover" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                {image.is_primary ? <StatusBadge label="Principal" tone="done" /> : <span className="text-sm">Imagen {index + 1}</span>}
                <div className="flex gap-1">
                  {!image.is_primary && (
                    <button type="button" disabled={busy} className={iconButtonClasses()} aria-label={`Usar la imagen ${index + 1} como principal`} onClick={() => void run(() => setPrimaryImage(product.id, image.id), 'Imagen principal actualizada.')}>
                      <Star aria-hidden="true" className="size-4" />
                    </button>
                  )}
                  <button type="button" disabled={busy || index === 0} className={iconButtonClasses()} aria-label={`Mover la imagen ${index + 1} antes`} onClick={() => move(index, -1)}>
                    <ArrowUp aria-hidden="true" className="size-4" />
                  </button>
                  <button type="button" disabled={busy || index === product.images.length - 1} className={iconButtonClasses()} aria-label={`Mover la imagen ${index + 1} después`} onClick={() => move(index, 1)}>
                    <ArrowDown aria-hidden="true" className="size-4" />
                  </button>
                  <button type="button" disabled={busy} className={iconButtonClasses()} aria-label={`Borrar la imagen ${index + 1}`} onClick={() => setToDelete(image)}>
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {full ? (
        <p className="text-sm">Llegaste al máximo de {MAX_IMAGES} imágenes. Borrá una para subir otra.</p>
      ) : (
        <div className="rounded-card border border-dashed border-text-main/30 p-4 dark:border-dark-text-secondary/40">
          <label htmlFor={inputId} className="text-sm font-bold">
            Nueva imagen
          </label>
          <input
            id={inputId}
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={pick}
            aria-describedby={`${inputId}-hint${error ? ` ${inputId}-error` : ''}`}
            aria-invalid={error ? true : undefined}
            className="mt-1 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-accent-secondary file:px-4 file:font-bold file:text-text-main dark:file:bg-dark-card dark:file:text-dark-text-main"
          />
          <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-text-main/75 dark:text-dark-text-secondary">
            JPEG, PNG o WebP, hasta 2 MB. Idealmente cuadrada.
          </p>
          {error && (
            <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-sm font-bold text-accent-main dark:text-dark-accent-main">
              {error}
            </p>
          )}
          {preview && file && (
            <figure className="mt-3 flex items-center gap-3">
              <img src={preview} alt="Vista previa de la imagen elegida" width={96} height={96} className="size-24 rounded-xl object-cover" />
              <figcaption className="min-w-0 text-sm break-words">{file.name}</figcaption>
            </figure>
          )}
          <Button variant="secondary" loading={busy} onClick={() => void upload()} className="mt-4">
            <ImagePlus aria-hidden="true" className="size-4" />
            Subir imagen
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="¿Borrar esta imagen?"
        confirmLabel="Borrar imagen"
        cancelLabel="Cancelar"
        safeFirst
        pending={busy}
        onConfirm={() => {
          if (!toDelete) return
          void run(() => removeImage(product.id, toDelete.id), 'Imagen borrada.').then(() => setToDelete(null))
        }}
        onCancel={() => setToDelete(null)}
      >
        <p>Se borra el archivo del servidor. No se puede deshacer.</p>
      </ConfirmDialog>
    </div>
  )
}
