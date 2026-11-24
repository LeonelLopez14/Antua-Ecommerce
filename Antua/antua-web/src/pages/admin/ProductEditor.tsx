import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react'
import { createProduct, fetchAdminProduct, fetchAdminTags, removeProduct, updateProduct } from '../../api/admin'
import { getApiErrorMessage } from '../../api/client'
import { useResource } from '../../hooks/useResource'
import { usePageMeta } from '../../hooks/usePageMeta'
import type { ProductFormValues } from '../../lib/adminForms'
import { toast } from '../../stores/toastStore'
import type { AdminProduct, AdminTag } from '../../types/admin'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { LoadingRows } from '../../components/admin/LoadingRows'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { UnsavedChangesDialog } from '../../components/ui/UnsavedChangesDialog'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import { ImagesSection } from '../../components/admin/product/ImagesSection'
import { ProductDataForm } from '../../components/admin/product/ProductDataForm'
import { VariantsSection } from '../../components/admin/product/VariantsSection'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ErrorState } from '../../components/ui/ErrorState'

const EMPTY: ProductFormValues = {
  name: '',
  slug: '',
  description: '',
  ingredients: '',
  allergens: '',
  nutrition_info: '',
  is_active: false,
  tagIds: [],
}

const toValues = (product: AdminProduct): ProductFormValues => ({
  name: product.name,
  slug: product.slug,
  description: product.description,
  ingredients: product.ingredients,
  allergens: product.allergens,
  nutrition_info: product.nutrition_info ?? '',
  is_active: product.is_active,
  tagIds: product.tags.map((tag) => tag.id),
})

const sameValues = (a: ProductFormValues, b: ProductFormValues) =>
  JSON.stringify({ ...a, tagIds: [...a.tagIds].sort() }) === JSON.stringify({ ...b, tagIds: [...b.tagIds].sort() })

const section = 'rounded-card bg-surface p-5 shadow-soft sm:p-6 dark:bg-dark-card dark:shadow-none scroll-mt-24'
const backLink = (
  <Link to="/admin/productos" className="inline-flex min-h-11 items-center gap-1 font-bold text-accent-main underline-offset-4 hover:underline dark:text-dark-accent-main">
    <ArrowLeft aria-hidden="true" className="size-4" />
    Productos
  </Link>
)

/** /admin/productos/nuevo y /admin/productos/:id. */
export default function ProductEditor() {
  const { id } = useParams()
  const isNew = id === 'nuevo'
  const productId = isNew ? null : Number(id)
  const tags = useResource('admin-tags', fetchAdminTags)
  const product = useResource(productId ? `admin-product-${productId}` : null, (signal) => fetchAdminProduct(productId ?? 0, signal))
  usePageMeta(isNew ? 'Nuevo producto · Panel' : product.state.status === 'ready' ? `${product.state.data.name} · Panel` : 'Producto · Panel')

  if (tags.state.status === 'loading' || product.state.status === 'loading') return <LoadingRows label="Cargando el producto…" />
  if (tags.state.status === 'error') return <ErrorState headingLevel={2} title="No pudimos cargar los tags" message={tags.state.message} onRetry={tags.retry} />
  if (product.state.status === 'error') {
    return (
      <>
        <AdminPageHeader title="Producto" back={backLink} />
        <ErrorState headingLevel={2} title={product.state.notFound ? 'Ese producto no existe' : 'No pudimos cargar el producto'} message={product.state.message} onRetry={product.retry} />
      </>
    )
  }
  const tagList = tags.state.status === 'ready' ? tags.state.data : []
  if (isNew) return <NewProduct tags={tagList} />
  if (product.state.status !== 'ready') return null
  return (
    <EditProduct
      key={product.state.data.id}
      product={product.state.data}
      tags={tagList}
      onUpdated={(next) => product.setData(() => next)}
      onReload={product.retry}
    />
  )
}

function NewProduct({ tags }: { tags: AdminTag[] }) {
  const navigate = useNavigate()
  const [dirty, setDirty] = useState(false)
  const { blocker, allowNextNavigation } = useUnsavedChanges(dirty)

  return (
    <>
      <AdminPageHeader title="Nuevo producto" description="Primero los datos; después vas a poder sumar variantes e imágenes." back={backLink} />
      <section aria-labelledby="datos-title" className={section}>
        <h2 id="datos-title" className="mb-4 font-display text-2xl font-semibold">
          Datos
        </h2>
        <ProductDataForm
          initial={EMPTY}
          tags={tags}
          isNew
          submitLabel="Crear producto"
          onChange={(values) => setDirty(!sameValues(values, EMPTY))}
          onSubmit={async (values) => {
            try {
              const created = await createProduct({
                name: values.name.trim(),
                slug: values.slug.trim() || undefined,
                description: values.description.trim(),
                ingredients: values.ingredients.trim(),
                allergens: values.allergens.trim(),
                nutrition_info: values.nutrition_info.trim() || null,
                tagIds: values.tagIds,
              })
              toast('Producto creado (inactivo). Ahora sumá variantes e imágenes.')
              allowNextNavigation()
              navigate(`/admin/productos/${created.id}#variantes`, { replace: true })
              return null
            } catch (error) {
              return getApiErrorMessage(error)
            }
          }}
        />
      </section>
      <UnsavedChangesDialog blocker={blocker} />
    </>
  )
}

interface EditProductProps {
  product: AdminProduct
  tags: AdminTag[]
  onUpdated: (product: AdminProduct) => void
  onReload: () => void
}

function EditProduct({ product, tags, onUpdated, onReload }: EditProductProps) {
  const navigate = useNavigate()
  const [dirty, setDirty] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { blocker, allowNextNavigation } = useUnsavedChanges(dirty)
  const saved = toValues(product)

  const remove = async () => {
    setDeleting(true)
    try {
      const result = await removeProduct(product.id)
      toast(result.message)
      setConfirmDelete(false)
      if (result.deleted) {
        allowNextNavigation()
        navigate('/admin/productos', { replace: true })
      } else {
        onReload()
      }
    } catch (error) {
      toast(getApiErrorMessage(error), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <AdminPageHeader
        title={product.name}
        back={backLink}
        actions={
          <>
            <StatusBadge label={product.is_active ? 'Activo' : 'Inactivo'} tone={product.is_active ? 'done' : 'muted'} />
            {product.is_active && (
              <Link to={`/producto/${product.slug}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 font-bold text-accent-main underline-offset-4 hover:underline dark:text-dark-accent-main">
                Ver en la tienda
                <ExternalLink aria-hidden="true" className="size-4" />
                <span className="sr-only">(se abre en otra pestaña)</span>
              </Link>
            )}
          </>
        }
      />

      <nav aria-label="Secciones del producto" className="mb-6">
        <ul className="flex flex-wrap gap-2 text-sm">
          {[
            ['#datos', 'Datos y tags'],
            ['#variantes', 'Variantes y stock'],
            ['#imagenes', 'Imágenes'],
            ['#borrar', 'Borrar'],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className="inline-flex min-h-11 items-center rounded-full bg-surface px-4 font-bold transition-[background-color] duration-200 ease-out hover:bg-accent-secondary dark:bg-dark-card dark:hover:bg-dark-surface">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-col gap-6">
        <section id="datos" aria-labelledby="datos-title" className={section}>
          <h2 id="datos-title" className="mb-4 font-display text-2xl font-semibold">
            Datos y tags
          </h2>
          <ProductDataForm
            key={formKey}
            initial={saved}
            tags={tags}
            isNew={false}
            submitLabel="Guardar cambios"
            onChange={(values) => setDirty(!sameValues(values, saved))}
            onSubmit={async (values) => {
              try {
                const updated = await updateProduct(product.id, {
                  name: values.name.trim(),
                  slug: values.slug.trim() || undefined,
                  description: values.description.trim(),
                  ingredients: values.ingredients.trim(),
                  allergens: values.allergens.trim(),
                  nutrition_info: values.nutrition_info.trim() || null,
                  is_active: values.is_active,
                  tagIds: values.tagIds,
                })
                onUpdated(updated)
                setDirty(false)
                setFormKey((k) => k + 1)
                toast('Producto guardado.')
                return null
              } catch (error) {
                return getApiErrorMessage(error)
              }
            }}
          />
        </section>

        <section id="variantes" aria-labelledby="variantes-title" className={section}>
          <h2 id="variantes-title" className="mb-1 font-display text-2xl font-semibold">
            Variantes y stock
          </h2>
          <p className="mb-4 text-sm text-text-main/80 dark:text-dark-text-secondary">
            Stock bajo: {product.lowStockThreshold} unidades o menos. Cada movimiento de stock queda en la auditoría.
          </p>
          <VariantsSection product={product} onUpdated={onUpdated} onReload={onReload} />
        </section>

        <section id="imagenes" aria-labelledby="imagenes-title" className={section}>
          <h2 id="imagenes-title" className="mb-4 font-display text-2xl font-semibold">
            Imágenes
          </h2>
          <ImagesSection product={product} onUpdated={onUpdated} />
        </section>

        <section id="borrar" aria-labelledby="borrar-title" className={section}>
          <h2 id="borrar-title" className="font-display text-2xl font-semibold">
            Borrar producto
          </h2>
          <p className="mt-2 max-w-2xl">
            {product.hasHistory
              ? 'Este producto tiene pedidos o carritos: no se puede borrar. Si seguís, se desactiva (deja de verse en la tienda) y se conserva el historial.'
              : 'No tiene pedidos ni carritos: se borra para siempre, con sus variantes e imágenes.'}
          </p>
          <Button variant="secondary" className="mt-4" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden="true" className="size-4" />
            {product.hasHistory ? 'Desactivar producto' : 'Borrar producto'}
          </Button>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={product.hasHistory ? `¿Desactivar ${product.name}?` : `¿Borrar ${product.name}?`}
        confirmLabel={product.hasHistory ? 'Desactivar' : 'Borrar para siempre'}
        cancelLabel="Cancelar"
        safeFirst
        pending={deleting}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      >
        <p>{product.hasHistory ? 'Deja de verse en la tienda. Lo podés volver a activar cuando quieras.' : 'No se puede deshacer.'}</p>
      </ConfirmDialog>
      <UnsavedChangesDialog blocker={blocker} />
    </>
  )
}
