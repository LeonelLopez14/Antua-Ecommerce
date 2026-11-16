import { useRef, useState, type FormEvent } from 'react'
import { PackagePlus, Pencil, Trash2, Warehouse } from 'lucide-react'
import { addVariant, moveStock, removeVariant, updateVariant } from '../../../api/admin'
import { getApiErrorMessage } from '../../../api/client'
import { formatExactPrice, variantLabel } from '../../../lib/format'
import { firstError, parseCount, parsePrice, priceInput, SKU_PATTERN, validateVariant, type Errors, type VariantFormValues } from '../../../lib/adminForms'
import { STOCK_REASON_LABEL } from '../../../lib/adminLabels'
import { toast } from '../../../stores/toastStore'
import { VARIANT_NAMES, type AdminProduct, type AdminVariant, type StockReason, type VariantName } from '../../../types/admin'
import { Button } from '../../ui/Button'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { Dialog } from '../../ui/Dialog'
import { FormField } from '../../ui/FormField'
import { iconButtonClasses } from '../../ui/buttonStyles'
import { CheckboxField, SelectField } from '../fields'
import { DataTable } from '../DataTable'
import { StatusBadge } from '../StatusBadge'

interface VariantsSectionProps {
  product: AdminProduct
  onUpdated: (product: AdminProduct) => void
  /** Después de borrar/desactivar, el producto se recarga (la respuesta no lo trae). */
  onReload: () => void
}

type Dialogs = { kind: 'edit' | 'stock' | 'delete'; variant: AdminVariant } | null

export function VariantsSection({ product, onUpdated, onReload }: VariantsSectionProps) {
  const [dialog, setDialog] = useState<Dialogs>(null)
  const [deleting, setDeleting] = useState(false)
  const missing = VARIANT_NAMES.filter((name) => !product.variants.some((variant) => variant.name === name))

  const remove = async (variant: AdminVariant) => {
    setDeleting(true)
    try {
      const result = await removeVariant(product.id, variant.id)
      toast(result.message)
      setDialog(null)
      onReload()
    } catch (error) {
      toast(getApiErrorMessage(error), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {product.variants.length === 0 ? (
        <p className="rounded-xl bg-accent-secondary px-4 py-3 dark:bg-dark-bg">Este producto todavía no tiene variantes: sumá al menos una para poder activarlo.</p>
      ) : (
        <DataTable
          caption={`Variantes de ${product.name}`}
          hideCaption
          rows={product.variants}
          rowKey={(variant) => variant.id}
          columns={[
            { key: 'name', header: 'Variante', rowHeader: true, cell: (v) => <span className="font-bold">{variantLabel(v.name)}</span> },
            { key: 'sku', header: 'SKU', cell: (v) => <code translate="no">{v.sku}</code> },
            { key: 'price', header: 'Precio', align: 'end', cell: (v) => formatExactPrice(v.price) },
            {
              key: 'stock',
              header: 'Stock',
              align: 'end',
              cell: (v) => (
                <span className="inline-flex items-center gap-2">
                  {v.stock}
                  {v.is_active && v.stock <= product.lowStockThreshold && <StatusBadge label={v.stock === 0 ? 'Sin stock' : 'Bajo'} tone="warning" />}
                </span>
              ),
            },
            { key: 'status', header: 'Estado', cell: (v) => <StatusBadge label={v.is_active ? 'Activa' : 'Inactiva'} tone={v.is_active ? 'done' : 'muted'} /> },
            {
              key: 'actions',
              header: 'Acciones',
              cell: (v) => (
                <div className="flex gap-1">
                  <button type="button" className={iconButtonClasses()} aria-label={`Editar ${variantLabel(v.name)}`} onClick={() => setDialog({ kind: 'edit', variant: v })}>
                    <Pencil aria-hidden="true" className="size-4" />
                  </button>
                  <button type="button" className={iconButtonClasses()} aria-label={`Mover stock de ${variantLabel(v.name)}`} onClick={() => setDialog({ kind: 'stock', variant: v })}>
                    <Warehouse aria-hidden="true" className="size-4" />
                  </button>
                  <button type="button" className={iconButtonClasses()} aria-label={`Borrar ${variantLabel(v.name)}`} onClick={() => setDialog({ kind: 'delete', variant: v })}>
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      {missing.length > 0 ? (
        <AddVariantForm productId={product.id} names={missing} onAdded={onUpdated} />
      ) : (
        <p className="text-sm text-text-main/80 dark:text-dark-text-secondary">Ya tiene las tres variantes (1, 6 y 12).</p>
      )}

      {dialog?.kind === 'edit' && <EditVariantDialog productId={product.id} variant={dialog.variant} onClose={() => setDialog(null)} onSaved={onUpdated} />}
      {dialog?.kind === 'stock' && <StockDialog productId={product.id} variant={dialog.variant} onClose={() => setDialog(null)} onSaved={onUpdated} />}
      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        title={`¿Borrar ${dialog ? variantLabel(dialog.variant.name) : 'la variante'}?`}
        confirmLabel="Borrar variante"
        cancelLabel="Cancelar"
        safeFirst
        pending={deleting}
        onConfirm={() => dialog && void remove(dialog.variant)}
        onCancel={() => setDialog(null)}
      >
        <p>
          {dialog?.variant.hasHistory
            ? 'Esta variante está en pedidos o carritos: no se va a borrar, se va a desactivar para conservar el historial.'
            : 'No tiene pedidos ni carritos: se borra para siempre.'}
        </p>
      </ConfirmDialog>
    </div>
  )
}

function AddVariantForm({ productId, names, onAdded }: { productId: number; names: VariantName[]; onAdded: (product: AdminProduct) => void }) {
  const [name, setName] = useState<VariantName>(names[0] ?? 'x1')
  const [values, setValues] = useState<VariantFormValues>({ price: '', stock: '0', sku: '' })
  const [errors, setErrors] = useState<Errors<keyof VariantFormValues>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  // Si se agregó la elegida, pasar a la próxima que falte.
  const current = names.includes(name) ? name : (names[0] ?? name)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found = validateVariant(values, true)
    setErrors(found)
    const first = firstError(['price', 'stock', 'sku'] as const, found)
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    setSaving(true)
    setServerError(null)
    try {
      const product = await addVariant(productId, {
        name: current,
        price: parsePrice(values.price) ?? 0,
        stock: parseCount(values.stock) ?? 0,
        sku: values.sku.trim(),
      })
      onAdded(product)
      toast(`Variante ${variantLabel(current)} agregada.`)
      setValues({ price: '', stock: '0', sku: '' })
    } catch (error) {
      setServerError(getApiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof VariantFormValues, value: string) => {
    setValues({ ...values, [key]: value })
    if (errors[key]) setErrors({ ...errors, [key]: undefined })
  }

  return (
    <form ref={formRef} noValidate onSubmit={(event) => void submit(event)} aria-labelledby="nueva-variante-title" className="rounded-card border border-dashed border-text-main/30 p-4 dark:border-dark-text-secondary/40">
      <h3 id="nueva-variante-title" className="font-display text-lg font-semibold">
        Agregar variante
      </h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField id="variante-nombre" name="name" label="Variante" value={current} onChange={(e) => setName(e.target.value as VariantName)}>
          {names.map((n) => (
            <option key={n} value={n}>
              {variantLabel(n)}
            </option>
          ))}
        </SelectField>
        <FormField id="variante-precio" name="price" label="Precio ($U)" inputMode="decimal" autoComplete="off" value={values.price} error={errors.price} placeholder="950…" onChange={(e) => set('price', e.target.value)} />
        <FormField id="variante-stock" name="stock" label="Stock inicial" inputMode="numeric" autoComplete="off" value={values.stock} error={errors.stock} onChange={(e) => set('stock', e.target.value)} />
        <FormField id="variante-sku" name="sku" label="SKU" autoComplete="off" spellCheck={false} translate="no" value={values.sku} error={errors.sku} placeholder="CLASICA-X6…" onChange={(e) => set('sku', e.target.value)} />
      </div>
      {serverError && (
        <p role="alert" className="mt-3 font-bold text-accent-main dark:text-dark-accent-main">
          {serverError}
        </p>
      )}
      <Button type="submit" variant="secondary" loading={saving} className="mt-4">
        <PackagePlus aria-hidden="true" className="size-4" />
        Agregar variante
      </Button>
    </form>
  )
}

function EditVariantDialog({ productId, variant, onClose, onSaved }: { productId: number; variant: AdminVariant; onClose: () => void; onSaved: (p: AdminProduct) => void }) {
  const [price, setPrice] = useState(priceInput(variant.price))
  const [sku, setSku] = useState(variant.sku)
  const [active, setActive] = useState(variant.is_active)
  const [errors, setErrors] = useState<{ price?: string; sku?: string }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const parsed = parsePrice(price)
    const found = {
      price: parsed === null ? 'Precio mayor a 0, con hasta 2 decimales.' : undefined,
      sku: SKU_PATTERN.test(sku.trim()) ? undefined : 'De 2 a 60 letras, números, guiones o guiones bajos.',
    }
    setErrors(found)
    if (found.price || found.sku) {
      document.getElementById(found.price ? 'editar-precio' : 'editar-sku')?.focus()
      return
    }
    setSaving(true)
    try {
      onSaved(await updateVariant(productId, variant.id, { price: parsed ?? undefined, sku: sku.trim(), is_active: active }))
      toast(`Variante ${variantLabel(variant.name)} guardada.`)
      onClose()
    } catch (error) {
      setServerError(getApiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} title={`Editar ${variantLabel(variant.name)}`} placement="center">
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <FormField id="editar-precio" label="Precio ($U)" inputMode="decimal" autoComplete="off" value={price} error={errors.price} onChange={(e) => setPrice(e.target.value)} />
        <FormField id="editar-sku" label="SKU" autoComplete="off" spellCheck={false} translate="no" value={sku} error={errors.sku} onChange={(e) => setSku(e.target.value)} />
        <CheckboxField id="editar-activa" label="Activa (se puede comprar)" checked={active} onChange={setActive} />
        <p className="text-sm text-text-main/80 dark:text-dark-text-secondary">El stock se cambia con “Mover stock”, que pide un motivo.</p>
        {serverError && (
          <p role="alert" className="font-bold text-accent-main dark:text-dark-accent-main">
            {serverError}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={saving}>
            Guardar variante
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function StockDialog({ productId, variant, onClose, onSaved }: { productId: number; variant: AdminVariant; onClose: () => void; onSaved: (p: AdminProduct) => void }) {
  const [reason, setReason] = useState<StockReason>('restock')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const parsed = parseCount(quantity)
  const preview =
    parsed === null ? null : reason === 'restock' ? variant.stock + parsed : reason === 'shrinkage' ? variant.stock - parsed : parsed

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    let found: string | undefined
    if (parsed === null) found = 'Escribí un número entero.'
    else if (reason !== 'adjustment' && parsed < 1) found = 'Tiene que ser al menos 1.'
    else if (reason === 'shrinkage' && parsed > variant.stock) found = `La merma no puede superar el stock actual (${variant.stock}).`
    setError(found)
    if (found) {
      document.getElementById('stock-cantidad')?.focus()
      return
    }
    setSaving(true)
    try {
      onSaved(await moveStock(productId, variant.id, { reason, quantity: parsed ?? 0, note: note.trim() || undefined }))
      toast(`Stock de ${variantLabel(variant.name)}: ${preview ?? ''} unidades.`)
      onClose()
    } catch (err) {
      setServerError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} title={`Mover stock: ${variantLabel(variant.name)}`} placement="center">
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <p>
          Stock actual: <strong className="tabular-nums">{variant.stock}</strong>
        </p>
        <SelectField id="stock-motivo" label="Motivo" value={reason} onChange={(e) => setReason(e.target.value as StockReason)}>
          {(Object.keys(STOCK_REASON_LABEL) as StockReason[]).map((key) => (
            <option key={key} value={key}>
              {STOCK_REASON_LABEL[key]}
            </option>
          ))}
        </SelectField>
        <FormField
          id="stock-cantidad"
          label={reason === 'adjustment' ? 'Stock contado' : 'Unidades'}
          inputMode="numeric"
          autoComplete="off"
          value={quantity}
          error={error}
          hint={preview !== null && preview >= 0 ? `Queda en ${preview} unidades.` : undefined}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <FormField id="stock-nota" label="Nota (opcional)" autoComplete="off" maxLength={200} value={note} placeholder="Llegó la producción del lunes…" onChange={(e) => setNote(e.target.value)} />
        {serverError && (
          <p role="alert" className="font-bold text-accent-main dark:text-dark-accent-main">
            {serverError}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={saving}>
            Guardar movimiento
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
