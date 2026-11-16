import { useState, type FormEvent } from 'react'
import { Lock, Pencil, Plus } from 'lucide-react'
import { createTag, fetchAdminTags, updateTag } from '../../api/admin'
import { getApiErrorMessage } from '../../api/client'
import { useResource } from '../../hooks/useResource'
import { usePageMeta } from '../../hooks/usePageMeta'
import { SLUG_PATTERN } from '../../lib/adminForms'
import { toast } from '../../stores/toastStore'
import type { AdminTag } from '../../types/admin'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { DataTable } from '../../components/admin/DataTable'
import { LoadingRows } from '../../components/admin/LoadingRows'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { CheckboxField } from '../../components/admin/fields'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { FormField } from '../../components/ui/FormField'
import { iconButtonClasses } from '../../components/ui/buttonStyles'

export default function Tags() {
  usePageMeta('Tags · Panel')
  const { state, retry, setData } = useResource('admin-tags', fetchAdminTags)
  const [editing, setEditing] = useState<AdminTag | 'new' | null>(null)
  const [toggling, setToggling] = useState<AdminTag | null>(null)
  const [busy, setBusy] = useState(false)

  const replace = (tag: AdminTag) =>
    setData((tags) => (tags.some((t) => t.id === tag.id) ? tags.map((t) => (t.id === tag.id ? { ...t, ...tag } : t)) : [...tags, tag]))

  const toggle = async (tag: AdminTag) => {
    setBusy(true)
    try {
      replace(await updateTag(tag.id, { is_active: !tag.is_active }))
      toast(tag.is_active ? `Tag “${tag.name}” desactivado.` : `Tag “${tag.name}” activado.`)
      setToggling(null)
    } catch (error) {
      toast(getApiErrorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Tags"
        description="Categorías de la tienda. Los tags no se borran: se desactivan. Los de la Home no cambian de slug."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden="true" className="size-4" />
            Nuevo tag
          </Button>
        }
      />
      {state.status === 'loading' && <LoadingRows label="Cargando tags…" />}
      {state.status === 'error' && <ErrorState headingLevel={2} title="No pudimos cargar los tags" message={state.message} onRetry={retry} />}
      {state.status === 'ready' &&
        (state.data.length === 0 ? (
          <EmptyState headingLevel={2} title="Todavía no hay tags" message="Creá el primero con “Nuevo tag”." />
        ) : (
          <DataTable
            caption="Tags"
            hideCaption
            rows={state.data}
            rowKey={(tag) => tag.id}
            columns={[
              {
                key: 'name',
                header: 'Nombre',
                rowHeader: true,
                cell: (tag) => (
                  <span className="inline-flex items-center gap-2 font-bold">
                    {tag.name}
                    {tag.protected && (
                      <span title="Lo usa la Home: el slug no cambia" className="inline-flex items-center gap-1 text-xs font-normal">
                        <Lock aria-hidden="true" className="size-3.5" />
                        Home
                      </span>
                    )}
                  </span>
                ),
              },
              { key: 'slug', header: 'Slug', cell: (tag) => <code translate="no">{tag.slug}</code> },
              { key: 'count', header: 'Productos', align: 'end', cell: (tag) => tag.productCount },
              { key: 'status', header: 'Estado', cell: (tag) => <StatusBadge label={tag.is_active ? 'Activo' : 'Inactivo'} tone={tag.is_active ? 'done' : 'muted'} /> },
              {
                key: 'actions',
                header: 'Acciones',
                cell: (tag) => (
                  <div className="flex flex-wrap items-center gap-1">
                    <button type="button" className={iconButtonClasses()} aria-label={`Editar ${tag.name}`} onClick={() => setEditing(tag)}>
                      <Pencil aria-hidden="true" className="size-4" />
                    </button>
                    <Button variant="secondary" className="min-h-11 px-4 py-2 text-sm" onClick={() => (tag.is_active ? setToggling(tag) : void toggle(tag))}>
                      {tag.is_active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        ))}
      {editing !== null && <TagDialog tag={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={replace} />}
      <ConfirmDialog
        open={toggling !== null}
        title={`¿Desactivar “${toggling?.name ?? ''}”?`}
        confirmLabel="Desactivar tag"
        cancelLabel="Cancelar"
        safeFirst
        pending={busy}
        onConfirm={() => toggling && void toggle(toggling)}
        onCancel={() => setToggling(null)}
      >
        <p>Deja de aparecer en la Tienda y en los filtros. Los productos no se tocan y lo podés volver a activar.</p>
      </ConfirmDialog>
    </>
  )
}

function TagDialog({ tag, onClose, onSaved }: { tag: AdminTag | null; onClose: () => void; onSaved: (tag: AdminTag) => void }) {
  const [name, setName] = useState(tag?.name ?? '')
  const [slug, setSlug] = useState(tag?.slug ?? '')
  const [active, setActive] = useState(tag?.is_active ?? true)
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found = {
      name: name.trim().length < 2 || name.trim().length > 50 ? 'De 2 a 50 caracteres.' : undefined,
      slug: slug.trim() && !SLUG_PATTERN.test(slug.trim()) ? 'Solo minúsculas, números y guiones.' : undefined,
    }
    setErrors(found)
    if (found.name || found.slug) {
      document.getElementById(found.name ? 'tag-nombre' : 'tag-slug')?.focus()
      return
    }
    setSaving(true)
    try {
      const saved = tag
        ? await updateTag(tag.id, { name: name.trim(), ...(tag.protected ? {} : { slug: slug.trim() || undefined }), is_active: active })
        : await createTag({ name: name.trim(), slug: slug.trim() || undefined })
      onSaved(tag ? saved : { ...saved, productCount: 0, protected: false })
      toast(tag ? 'Tag guardado.' : `Tag “${saved.name}” creado.`)
      onClose()
    } catch (error) {
      setServerError(getApiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} title={tag ? `Editar “${tag.name}”` : 'Nuevo tag'} placement="center">
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <FormField id="tag-nombre" label="Nombre" autoComplete="off" value={name} error={errors.name} placeholder="De temporada…" onChange={(e) => setName(e.target.value)} />
        <FormField
          id="tag-slug"
          label="Slug"
          autoComplete="off"
          spellCheck={false}
          translate="no"
          value={slug}
          disabled={tag?.protected}
          error={errors.slug}
          placeholder="de-temporada…"
          hint={tag?.protected ? 'Lo usa la Home: no se puede cambiar.' : 'Vacío: se genera a partir del nombre.'}
          onChange={(e) => setSlug(e.target.value)}
        />
        {tag && <CheckboxField id="tag-activo" label="Activo" checked={active} onChange={setActive} />}
        {serverError && (
          <p role="alert" className="font-bold text-accent-main dark:text-dark-accent-main">
            {serverError}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={saving}>
            {tag ? 'Guardar tag' : 'Crear tag'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
