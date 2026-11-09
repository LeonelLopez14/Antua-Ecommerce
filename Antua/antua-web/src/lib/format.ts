const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export const formatPrice = (value: number): string => priceFormatter.format(value)

const ratingFormatter = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** 4.5 → "4,5" */
export const formatRating = (value: number): string => ratingFormatter.format(value)

const dateFormatter = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

/** ISO → "13 de octubre de 2026". Devuelve null si la fecha no es válida. */
export function formatDate(iso: string): string | null {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date)
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
