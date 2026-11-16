/**
 * Moneda de la tienda: pesos uruguayos, la misma que usa el backend en los pagos
 * (PAYMENT_CURRENCY=UYU en antua-api). Es el ÚNICO formateador de montos de la app, panel incluido.
 */
export const LOCALE = 'es-UY'
export const CURRENCY = 'UYU'

const priceFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 0,
})

// Para los montos con centavos (por ejemplo, el precio de una variante en el panel).
const exactPriceFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export const formatPrice = (value: number): string => priceFormatter.format(value)

/** Igual que formatPrice, pero sin redondear los centavos: 950,5 → "$ 950,5". */
export const formatExactPrice = (value: number): string => exactPriceFormatter.format(value)

const numberFormatter = new Intl.NumberFormat(LOCALE)

/** Cantidades (unidades, pedidos): 1234 → "1.234". */
export const formatNumber = (value: number): string => numberFormatter.format(value)

const ratingFormatter = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** 4.5 → "4,5" */
export const formatRating = (value: number): string => ratingFormatter.format(value)

const dateFormatter = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Montevideo',
})
const shortDayFormatter = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** ISO → "13 de octubre de 2026". Devuelve null si la fecha no es válida. */
export function formatDate(iso: string): string | null {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date)
}

/** ISO → "15 nov 2026, 14:30" en hora de Montevideo (la de la tienda). */
export function formatDateTime(iso: string): string | null {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : dateTimeFormatter.format(date)
}

/** "2026-11-15" (día de calendario) → "15 nov". */
export function formatShortDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? day : shortDayFormatter.format(date)
}

/** Nombre legible de una variante del backend: "x6" → "Caja de 6", "x1" → "1 galleta". */
export function variantLabel(name: string): string {
  const match = /^x(\d+)$/i.exec(name.trim())
  if (!match) return name
  const count = Number(match[1])
  return count === 1 ? '1 galleta' : `Caja de ${count}`
}

/** Plazo estimado de entrega: 1 → "Llega en aproximadamente 1 día". */
export const shippingEtaLabel = (days: number): string => `Llega en aproximadamente ${days} ${days === 1 ? 'día' : 'días'}`

/** 1 → "1 galleta", 3 → "3 galletas". */
export const galletas = (n: number): string => `${n} ${n === 1 ? 'galleta' : 'galletas'}`
