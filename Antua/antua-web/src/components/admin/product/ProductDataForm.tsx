import { useRef, useState, type FormEvent } from 'react'
import type { AdminTag } from '../../../types/admin'
import { firstError, validateProduct, type Errors, type ProductFormValues } from '../../../lib/adminForms'
import { FormField } from '../../ui/FormField'
import { Button } from '../../ui/Button'
import { CheckboxField, TextAreaField } from '../fields'

const ORDER = ['name', 'slug', 'description', 'ingredients', 'allergens', 'nutrition_info'] as const

interface ProductDataFormProps {
  initial: ProductFormValues
  tags: AdminTag[]
  isNew: boolean
  submitLabel: string
  onChange: (values: ProductFormValues) => void
  /** Devuelve un mensaje de error del servidor o null si salió bien. */
  onSubmit: (values: ProductFormValues) => Promise<string | null>
}

/** Datos y tags del producto. Validación en línea y foco en el primer error al guardar. */
export function ProductDataForm({ initial, tags, isNew, submitLabel, onChange, onSubmit }: ProductDataFormProps) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Errors<keyof ProductFormValues>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const update = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    const next = { ...values, [key]: value }
    setValues(next)
    onChange(next)
    if (errors[key]) setErrors({ ...errors, [key]: undefined })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found = validateProduct(values)
    setErrors(found)
    const first = firstError(ORDER, found)
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    setSaving(true)
    setServerError(null)
    const message = await onSubmit(values)
    setSaving(false)
    if (message) setServerError(message)
  }

  const activeTags = tags.filter((tag) => tag.is_active || values.tagIds.includes(tag.id))

  return (
    <form ref={formRef} noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <FormField id="producto-nombre" name="name" label="Nombre" autoComplete="off" value={values.name} error={errors.name} placeholder="Clásica con chips…" onChange={(e) => update('name', e.target.value)} />
        <FormField
          id="producto-slug"
          name="slug"
          label="Slug (URL)"
          autoComplete="off"
          spellCheck={false}
          translate="no"
          value={values.slug}
          error={errors.slug}
          placeholder="clasica-chips…"
          hint={isNew ? 'Si lo dejás vacío, se genera a partir del nombre.' : 'Cambiarlo rompe los links que ya circulan.'}
          onChange={(e) => update('slug', e.target.value)}
        />
      </div>
      <TextAreaField id="producto-descripcion" name="description" label="Descripción" value={values.description} error={errors.description} placeholder="Crocante por fuera, suave por dentro…" onChange={(e) => update('description', e.target.value)} />
      <div className="grid gap-5 md:grid-cols-2">
        <TextAreaField id="producto-ingredientes" name="ingredients" label="Ingredientes" rows={3} value={values.ingredients} error={errors.ingredients} placeholder="Harina, manteca, azúcar mascabo…" onChange={(e) => update('ingredients', e.target.value)} />
        <TextAreaField id="producto-alergenos" name="allergens" label="Alérgenos" rows={3} value={values.allergens} error={errors.allergens} placeholder="Gluten, leche, huevo…" onChange={(e) => update('allergens', e.target.value)} />
      </div>
      <TextAreaField
        id="producto-nutricion"
        name="nutrition_info"
        label="Información nutricional (opcional)"
        value={values.nutrition_info}
        error={errors.nutrition_info}
        rows={6}
        placeholder={'Valores | Por 100 g | Por unidad (40 g)\nEnergía | 480 kcal | 192 kcal…'}
        hint="Para que se vea como tabla: una fila por línea, con las columnas separadas por “|”. La primera línea es el encabezado."
        onChange={(e) => update('nutrition_info', e.target.value)}
      />

      <fieldset>
        <legend className="text-sm font-bold">Tags</legend>
        {activeTags.length === 0 ? (
          <p className="mt-1 text-sm">Todavía no hay tags. Creálos en la sección Tags.</p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-x-6">
            {activeTags.map((tag) => (
              <CheckboxField
                key={tag.id}
                id={`tag-${tag.id}`}
                name="tagIds"
                label={tag.is_active ? tag.name : `${tag.name} (inactivo)`}
                checked={values.tagIds.includes(tag.id)}
                onChange={(checked) => update('tagIds', checked ? [...values.tagIds, tag.id] : values.tagIds.filter((id) => id !== tag.id))}
              />
            ))}
          </div>
        )}
      </fieldset>

      {!isNew && (
        <CheckboxField
          id="producto-activo"
          name="is_active"
          label="Activo (visible en la tienda)"
          hint="Para activarlo hace falta al menos una variante activa."
          checked={values.is_active}
          onChange={(checked) => update('is_active', checked)}
        />
      )}

      {serverError && (
        <p role="alert" className="rounded-xl bg-accent-secondary px-4 py-3 font-bold dark:bg-dark-bg dark:text-dark-accent-main">
          {serverError}
        </p>
      )}
      <div>
        <Button type="submit" loading={saving}>
          {saving ? 'Guardando…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
