import type { BadgeTone } from '../components/admin/StatusBadge'
import type { AdminCoupon, CouponStatus, OrderStatusValue, StockReason } from '../types/admin'
import { formatExactPrice } from './format'

/** Textos del panel. El estado siempre se lee en el texto y el ícono, nunca solo en el color. */
export const ORDER_STATUS_ADMIN: Record<OrderStatusValue, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pendiente', tone: 'neutral' },
  preparing: { label: 'En preparación', tone: 'progress' },
  shipped: { label: 'Enviado', tone: 'progress' },
  delivered: { label: 'Entregado', tone: 'done' },
  canceled: { label: 'Cancelado', tone: 'muted' },
}

/** Botón que lleva a cada estado (acción, en infinitivo). */
export const ORDER_ACTION_LABEL: Record<OrderStatusValue, string> = {
  pending: 'Volver a pendiente',
  preparing: 'Pasar a preparación',
  shipped: 'Marcar como enviado',
  delivered: 'Marcar como entregado',
  canceled: 'Cancelar pedido',
}

export const PAYMENT_STATUS_ADMIN: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pago pendiente', tone: 'neutral' },
  paid: { label: 'Pagado', tone: 'done' },
  failed: { label: 'Pago rechazado', tone: 'warning' },
  canceled: { label: 'Pago cancelado', tone: 'muted' },
  refunded: { label: 'Devuelto', tone: 'muted' },
  paid_after_cancel: { label: 'Pagó tarde: revisar', tone: 'warning' },
  amount_mismatch: { label: 'Monto distinto: revisar', tone: 'warning' },
}

export const paymentInfo = (status: string) => PAYMENT_STATUS_ADMIN[status] ?? { label: status, tone: 'neutral' as BadgeTone }
export const orderInfo = (status: string) =>
  ORDER_STATUS_ADMIN[status as OrderStatusValue] ?? { label: status, tone: 'neutral' as BadgeTone }

export const COUPON_STATUS_ADMIN: Record<CouponStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Activo', tone: 'done' },
  inactive: { label: 'Inactivo', tone: 'muted' },
  scheduled: { label: 'Programado', tone: 'neutral' },
  expired: { label: 'Vencido', tone: 'muted' },
  exhausted: { label: 'Agotado', tone: 'warning' },
}

export const STOCK_REASON_LABEL: Record<StockReason, string> = {
  restock: 'Reposición (suma)',
  shrinkage: 'Merma (resta)',
  adjustment: 'Ajuste manual (stock contado)',
}

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  'product.create': 'Creó un producto',
  'product.update': 'Editó un producto',
  'product.delete': 'Borró un producto',
  'product.deactivate': 'Desactivó un producto (tenía historial)',
  'variant.create': 'Agregó una variante',
  'variant.update': 'Editó una variante',
  'variant.delete': 'Borró una variante',
  'variant.deactivate': 'Desactivó una variante (tenía historial)',
  'stock.move': 'Movió stock',
  'image.create': 'Subió una imagen',
  'image.delete': 'Borró una imagen',
  'image.primary': 'Cambió la imagen principal',
  'image.reorder': 'Ordenó las imágenes',
  'tag.create': 'Creó un tag',
  'tag.update': 'Editó un tag',
  'coupon.create': 'Creó un cupón',
  'coupon.update': 'Editó un cupón',
  'coupon.delete': 'Borró un cupón',
  'coupon.deactivate': 'Desactivó un cupón (ya usado)',
  'order.status': 'Cambió el estado de un pedido',
  'order.note': 'Editó la nota interna de un pedido',
  'review.hide': 'Ocultó una reseña',
  'review.show': 'Volvió a mostrar una reseña',
  'review.delete': 'Borró una reseña',
  'export.orders': 'Exportó pedidos (CSV)',
  'export.products': 'Exportó el catálogo (CSV)',
}

export const AUDIT_ENTITY_LABEL: Record<string, string> = {
  product: 'Producto',
  variant: 'Variante',
  tag: 'Tag',
  coupon: 'Cupón',
  order: 'Pedido',
  review: 'Reseña',
}

/** "20 %" o "$ 1.000". */
export const discountLabel = (coupon: Pick<AdminCoupon, 'discount_type' | 'discount_value'>): string =>
  coupon.discount_type === 'percentage' ? `${coupon.discount_value} %` : formatExactPrice(coupon.discount_value)
