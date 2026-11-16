/** Validación en línea del panel. Las mismas reglas que valida el backend (los DTOs de src/admin). */

export type Errors<K extends string> = Partial<Record<K, string>>

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const SKU_PATTERN = /^[A-Za-z0-9_-]{2,60}$/
export const COUPON_CODE_PATTERN = /^[A-Z0-9_-]{3,50}$/

/** "950,50" o "950.5" → 950.5. null si no es un monto válido (positivo, hasta 2 decimales). */
export function parsePrice(text: string): number | null {
  const normalized = text.trim().replace(/\s/g, '').replace(',', '.')
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(normalized)) return null
  const value = Number(normalized)
  return value > 0 ? value : null
}

/** Entero no negativo ("12" → 12). null si no lo es. */
export function parseCount(text: string, max = 1_000_000): number | null {
  if (!/^\d+$/.test(text.trim())) return null
  const value = Number(text.trim())
  return value <= max ? value : null
}

/** "verano 20" → "VERANO20", igual que normalizeCouponCode del backend. */
export const normalizeCode = (text: string): string => text.toUpperCase().replace(/\s+/g, '')

/** Monto con 2 decimales como máximo para mostrar en un input ("950.5" → "950,5"). */
export const priceInput = (value: number): string => String(value).replace('.', ',')

export interface ProductFormValues {
  name: string
  slug: string
  description: string
  ingredients: string
  allergens: string
  nutrition_info: string
  is_active: boolean
  tagIds: number[]
}

export function validateProduct(values: ProductFormValues): Errors<keyof ProductFormValues> {
  const errors: Errors<keyof ProductFormValues> = {}
  const name = values.name.trim()
  if (name.length < 2) errors.name = 'Escribí el nombre (al menos 2 letras).'
  else if (name.length > 155) errors.name = 'El nombre puede tener hasta 155 caracteres.'
  if (values.slug.trim() && !SLUG_PATTERN.test(values.slug.trim())) {
    errors.slug = 'Solo minúsculas, números y guiones. Ejemplo: clasica-chips.'
  }
  if (!values.description.trim()) errors.description = 'Contá en una o dos frases cómo es la galleta.'
  else if (values.description.length > 5000) errors.description = 'La descripción puede tener hasta 5000 caracteres.'
  if (!values.ingredients.trim()) errors.ingredients = 'Listá los ingredientes, separados por coma.'
  else if (values.ingredients.length > 500) errors.ingredients = 'Hasta 500 caracteres.'
  if (!values.allergens.trim()) errors.allergens = 'Indicá los alérgenos, o escribí “Ninguno declarado”.'
  else if (values.allergens.length > 255) errors.allergens = 'Hasta 255 caracteres.'
  if (values.nutrition_info.length > 2000) errors.nutrition_info = 'Hasta 2000 caracteres.'
  return errors
}

export interface VariantFormValues {
  price: string
  stock: string
  sku: string
}

export function validateVariant(values: VariantFormValues, withStock: boolean): Errors<keyof VariantFormValues> {
  const errors: Errors<keyof VariantFormValues> = {}
  if (parsePrice(values.price) === null) errors.price = 'Precio mayor a 0, con hasta 2 decimales. Ejemplo: 950 o 950,50.'
  if (withStock && parseCount(values.stock) === null) errors.stock = 'Un número entero, 0 o más.'
  if (!SKU_PATTERN.test(values.sku.trim())) errors.sku = 'De 2 a 60 letras, números, guiones o guiones bajos. Ejemplo: CLASICA-X6.'
  return errors
}

/** Primer campo con error, en el orden del formulario (para llevarle el foco). */
export function firstError<K extends string>(order: readonly K[], errors: Errors<K>): K | undefined {
  return order.find((key) => errors[key])
}

/**
 * Las fechas de los cupones se eligen como días de calendario de Uruguay (UTC−3, sin horario de verano):
 * empiezan a las 00:00 y terminan a las 23:59:59 de Montevideo.
 */
export const dayStartIso = (day: string): string => new Date(`${day}T00:00:00-03:00`).toISOString()
export const dayEndIso = (day: string): string => new Date(`${day}T23:59:59-03:00`).toISOString()

const storeDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit' })
/** ISO → "AAAA-MM-DD" en Montevideo (para un input type="date"). */
export const isoToDay = (iso: string): string => storeDay.format(new Date(iso))

export interface CouponFormValues {
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: string
  min_order_amount: string
  usage_limit: string
  valid_from: string
  valid_until: string
  is_active: boolean
}

export function validateCoupon(values: CouponFormValues): Errors<keyof CouponFormValues> {
  const errors: Errors<keyof CouponFormValues> = {}
  if (!COUPON_CODE_PATTERN.test(normalizeCode(values.code))) errors.code = 'De 3 a 50 letras, números, guiones o guiones bajos. Ejemplo: VERANO20.'
  const value = parsePrice(values.discount_value)
  if (value === null) errors.discount_value = 'Un número mayor a 0, con hasta 2 decimales.'
  else if (values.discount_type === 'percentage' && (value < 1 || value > 100)) errors.discount_value = 'El porcentaje va de 1 a 100.'
  if (values.min_order_amount.trim() && parsePrice(values.min_order_amount) === null) errors.min_order_amount = 'Dejalo vacío o escribí un monto mayor a 0.'
  if (values.usage_limit.trim() && parseCount(values.usage_limit) === null) errors.usage_limit = 'Dejalo vacío (sin límite) o escribí un entero, 0 o más.'
  if (!values.valid_from) errors.valid_from = 'Elegí desde cuándo vale.'
  if (!values.valid_until) errors.valid_until = 'Elegí hasta cuándo vale.'
  else if (values.valid_from && values.valid_until < values.valid_from) errors.valid_until = 'Tiene que ser igual o posterior a la fecha de inicio.'
  else if (values.valid_until > '2037-12-31') errors.valid_until = 'Elegí una fecha hasta 2037.'
  return errors
}
