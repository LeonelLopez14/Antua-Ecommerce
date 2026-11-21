import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { createCoupon, fetchAdminCoupon, removeCoupon, updateCoupon } from '../../api/admin'
import { getApiErrorMessage } from '../../api/client'
import { useResource } from '../../hooks/useResource'
import { usePageMeta } from '../../hooks/usePageMeta'
import {
  dayEndIso,
  dayStartIso,
  firstError,
  isoToDay,
  normalizeCode,
  parseCount,
  parsePrice,
  priceInput,
  validateCoupon,
  type CouponFormValues,
  type Errors,
} from '../../lib/adminForms'
import { COUPON_STATUS_ADMIN } from '../../lib/adminLabels'
import { toast } from '../../stores/toastStore'
import type { AdminCoupon } from '../../types/admin'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { LoadingRows } from '../../components/admin/LoadingRows'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { UnsavedChangesDialog } from '../../components/ui/UnsavedChangesDialog'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import { CheckboxField, SelectField } from '../../components/admin/fields'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ErrorState } from '../../components/ui/ErrorState'
import { FormField } from '../../components/ui/FormField'

const ORDER = ['code', 'discount_value', 'min_order_amount', 'usage_limit', 'valid_from', 'valid_until'] as const
const today = () => isoToDay(new Date().toISOString())

const toValues = (coupon: AdminCoupon | null): CouponFormValues =>
  coupon
    ? {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: priceInput(coupon.discount_value),
        min_order_amount: coupon.min_order_amount ? priceInput(coupon.min_order_amount) : '',
        usage_limit: coupon.usage_limit === null ? '' : String(coupon.usage_limit),
        valid_from: isoToDay(coupon.valid_from),
        valid_until: isoToDay(coupon.valid_until),
        is_active: coupon.is_active,
      }
    : { code: '', discount_type: 'percentage', discount_value: '', min_order_amount: '', usage_limit: '', valid_from: today(), valid_until: '', is_active: true }

const backLink = (
  <Link to="/admin/cupones" className="inline-flex min-h-11 items-center gap-1 font-bold text-accent-main underline-offset-4 hover:underline dark:text-dark-accent-main">
    <ArrowLeft aria-hidden="true" className="size-4" />
    Cupones
  </Link>
)

/** /admin/cupones/nuevo y /admin/cupones/:id. */
export default function CouponEditor() {
  const { id } = useParams()
  const couponId = id === 'nuevo' ? null : Number(id)
  const coupon = useResource(couponId ? `admin-coupon-${couponId}` : null, (signal) => fetchAdminCoupon(couponId ?? 0, signal))
  usePageMeta(couponId ? 'Cupón · Panel' : 'Nuevo cupón · Panel')

  if (coupon.state.status === 'loading') return <LoadingRows label="Cargando el cupón…" />
  if (coupon.state.status === 'error') {
    return (
      <>
        <AdminPageHeader title="Cupón" back={backLink} />
        <ErrorState headingLevel={2} title={coupon.state.notFound ? 'Ese cupón no existe' : 'No pudimos cargar el cupón'} message={coupon.state.message} onRetry={coupon.retry} />
      </>
    )
  }
  const current = coupon.state.status === 'ready' ? coupon.state.data : null
  return <CouponForm key={current?.id ?? 'nuevo'} coupon={current} onSaved={(saved) => coupon.setData(() => saved)} />
}

function CouponForm({ coupon, onSaved }: { coupon: AdminCoupon | null; onSaved: (coupon: AdminCoupon) => void }) {
  const navigate = useNavigate()
  const initial = toValues(coupon)
  const [values, setValues] = useState(initial)
  const [baseline, setBaseline] = useState(initial)
  const [errors, setErrors] = useState<Errors<keyof CouponFormValues>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline)
  const { blocker, allowNextNavigation } = useUnsavedChanges(dirty)

  const set = <K extends keyof CouponFormValues>(key: K, value: CouponFormValues[K]) => {
    setValues({ ...values, [key]: value })
    if (errors[key]) setErrors({ ...errors, [key]: undefined })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found = validateCoupon(values)
    setErrors(found)
    const first = firstError(ORDER, found)
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    const input = {
      code: normalizeCode(values.code),
      discount_type: values.discount_type,
      discount_value: parsePrice(values.discount_value) ?? 0,
      min_order_amount: values.min_order_amount.trim() ? parsePrice(values.min_order_amount) : null,
      usage_limit: values.usage_limit.trim() ? parseCount(values.usage_limit) : null,
      valid_from: dayStartIso(values.valid_from),
      valid_until: dayEndIso(values.valid_until),
      is_active: values.is_active,
    }
    setSaving(true)
    setServerError(null)
    try {
      const saved = coupon ? await updateCoupon(coupon.id, input) : await createCoupon(input)
      toast(coupon ? `Cupón ${saved.code} guardado.` : `Cupón ${saved.code} creado.`)
      const next = toValues(saved)
      setValues(next)
      setBaseline(next)
      if (coupon) {
        onSaved(saved)
      } else {
        allowNextNavigation()
        navigate(`/admin/cupones/${saved.id}`, { replace: true })
      }
    } catch (error) {
      setServerError(getApiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!coupon) return
    setDeleting(true)
    try {
      const result = await removeCoupon(coupon.id)
      toast(result.message)
      allowNextNavigation()
      navigate('/admin/cupones', { replace: true })
    } catch (error) {
      toast(getApiErrorMessage(error), 'error')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <>
      <AdminPageHeader
        title={coupon ? coupon.code : 'Nuevo cupón'}
        back={backLink}
        actions={coupon && <StatusBadge {...COUPON_STATUS_ADMIN[coupon.status]} />}
        description={coupon ? `Usado ${coupon.times_used} ${coupon.times_used === 1 ? 'vez' : 'veces'}.` : 'El código se guarda en mayúsculas y sin espacios.'}
      />
      <form ref={formRef} noValidate onSubmit={(event) => void submit(event)} className="flex max-w-3xl flex-col gap-5 rounded-card bg-surface p-5 shadow-soft sm:p-6 dark:bg-dark-card dark:shadow-none">
        <FormField
          id="cupon-codigo"
          name="code"
          label="Código"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          translate="no"
          value={values.code}
          error={errors.code}
          placeholder="VERANO20…"
          hint={values.code && normalizeCode(values.code) !== values.code ? `Se guarda como ${normalizeCode(values.code)}.` : undefined}
          onChange={(e) => set('code', e.target.value)}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField id="cupon-tipo" name="discount_type" label="Tipo de descuento" value={values.discount_type} onChange={(e) => set('discount_type', e.target.value as CouponFormValues['discount_type'])}>
            <option value="percentage">Porcentaje (%)</option>
            <option value="fixed">Monto fijo ($U)</option>
          </SelectField>
          <FormField
            id="cupon-valor"
            name="discount_value"
            label={values.discount_type === 'percentage' ? 'Porcentaje (1 a 100)' : 'Monto ($U)'}
            inputMode="decimal"
            autoComplete="off"
            value={values.discount_value}
            error={errors.discount_value}
            placeholder={values.discount_type === 'percentage' ? '10…' : '500…'}
            onChange={(e) => set('discount_value', e.target.value)}
          />
          <FormField
            id="cupon-minimo"
            name="min_order_amount"
            label="Compra mínima ($U, opcional)"
            inputMode="decimal"
            autoComplete="off"
            value={values.min_order_amount}
            error={errors.min_order_amount}
            placeholder="3000…"
            onChange={(e) => set('min_order_amount', e.target.value)}
          />
          <FormField
            id="cupon-limite"
            name="usage_limit"
            label="Límite de usos (opcional)"
            inputMode="numeric"
            autoComplete="off"
            value={values.usage_limit}
            error={errors.usage_limit}
            hint="Vacío: sin límite."
            onChange={(e) => set('usage_limit', e.target.value)}
          />
          <FormField id="cupon-desde" name="valid_from" type="date" label="Vale desde" value={values.valid_from} error={errors.valid_from} onChange={(e) => set('valid_from', e.target.value)} />
          <FormField
            id="cupon-hasta"
            name="valid_until"
            type="date"
            label="Vale hasta (inclusive)"
            min={values.valid_from || undefined}
            value={values.valid_until}
            error={errors.valid_until}
            hint="Hora de Montevideo: de 00:00 a 23:59."
            onChange={(e) => set('valid_until', e.target.value)}
          />
        </div>
        <CheckboxField id="cupon-activo" name="is_active" label="Activo" checked={values.is_active} onChange={(checked) => set('is_active', checked)} />
        {serverError && (
          <p role="alert" className="rounded-xl bg-accent-secondary px-4 py-3 font-bold dark:bg-dark-bg dark:text-dark-accent-main">
            {serverError}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={saving}>
            {coupon ? 'Guardar cupón' : 'Crear cupón'}
          </Button>
          {coupon && (
            <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden="true" className="size-4" />
              {coupon.times_used > 0 ? 'Desactivar cupón' : 'Borrar cupón'}
            </Button>
          )}
        </div>
      </form>
      <ConfirmDialog
        open={confirmDelete}
        title={coupon && coupon.times_used > 0 ? `¿Desactivar ${coupon.code}?` : `¿Borrar ${coupon?.code ?? 'el cupón'}?`}
        confirmLabel={coupon && coupon.times_used > 0 ? 'Desactivar' : 'Borrar cupón'}
        cancelLabel="Cancelar"
        safeFirst
        pending={deleting}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      >
        <p>
          {coupon && coupon.times_used > 0
            ? 'Ya se usó: no se borra, se desactiva y queda en el historial de los pedidos.'
            : 'Si nunca se usó ni está en un carrito, se borra para siempre. Si no, se desactiva.'}
        </p>
      </ConfirmDialog>
      <UnsavedChangesDialog blocker={blocker} />
    </>
  )
}
