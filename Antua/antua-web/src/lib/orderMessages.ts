import { isAxiosError } from 'axios'
import { getApiErrorMessage } from '../api/client'
import { couponErrorMessage } from './cartMessages'
import type { OrderStatus } from '../types/order'

/** Un producto cuyo precio cambió desde que se agregó al carrito (409 PRICE_CHANGED). */
export interface PriceChange {
  productName: string
  variantName: string
  oldPrice: number
  newPrice: number
}

/** Error de POST /orders traducido y con un camino para resolverlo. */
export interface OrderError {
  message: string
  /** El problema está en el carrito (stock, cupón, vacío): ofrecer volver a revisarlo. */
  reviewCart: boolean
  /** Hay precios nuevos: el carrito ya se actualizó y se pide confirmar de nuevo. */
  priceChanges?: PriceChange[]
}

interface PriceChangedBody {
  code: 'PRICE_CHANGED'
  changes: PriceChange[]
}

const isPriceChangedBody = (data: unknown): data is PriceChangedBody =>
  typeof data === 'object' && data !== null && 'code' in data && data.code === 'PRICE_CHANGED' && 'changes' in data && Array.isArray(data.changes)

/**
 * Traduce los errores de orders.service.ts. El backend responde 400 con mensajes sin tildes
 * ("No hay suficiente stock para la variante x6.", "El cupon ha expirado…", etc.).
 */
export function orderErrorFrom(error: unknown): OrderError {
  if (isAxiosError(error) && error.response?.status === 409 && isPriceChangedBody(error.response.data)) {
    return {
      message: 'Actualizamos tu carrito con los precios nuevos. Revisá el total y confirmá de nuevo.',
      reviewCart: true,
      priceChanges: error.response.data.changes,
    }
  }
  const message = getApiErrorMessage(error, 'No pudimos registrar tu pedido. Probá de nuevo en un rato.')
  if (!isAxiosError(error) || !error.response || error.response.status >= 500) {
    return { message, reviewCart: false }
  }
  if (/stock/i.test(message)) {
    return {
      message: 'Alguna galleta de tu carrito se quedó sin stock suficiente. Revisá las cantidades y volvé a confirmar.',
      reviewCart: true,
    }
  }
  if (/cupon|coupon|minimo/i.test(message)) {
    const translated = couponErrorMessage(message)
    return {
      message: `${translated === message ? 'El cupón ya no se puede usar.' : translated} Quitalo o cambialo en el carrito y volvé a confirmar.`,
      reviewCart: true,
    }
  }
  if (/carrito.*vac/i.test(message)) {
    return { message: 'Tu carrito está vacío. Sumá galletas para hacer un pedido.', reviewCart: true }
  }
  if (/variante|no existe/i.test(message)) {
    return { message: 'Una de las galletas ya no está a la venta. Quitala del carrito y volvé a confirmar.', reviewCart: true }
  }
  if (/email/i.test(message)) {
    return { message: 'Necesitamos tu email para avisarte del pedido. Revisalo en el paso de dirección.', reviewCart: false }
  }
  return { message, reviewCart: false }
}

/** Nombre y tono del badge de cada estado de pedido. */
const ORDER_STATUS: Record<OrderStatus, { label: string; tone: 'neutral' | 'progress' | 'done' | 'muted' }> = {
  pending: { label: 'Recibido', tone: 'neutral' },
  preparing: { label: 'En preparación', tone: 'progress' },
  shipped: { label: 'En camino', tone: 'progress' },
  delivered: { label: 'Entregado', tone: 'done' },
  canceled: { label: 'Cancelado', tone: 'muted' },
}

const isOrderStatus = (status: string): status is OrderStatus => Object.hasOwn(ORDER_STATUS, status)

/** Estado conocido → su badge; estado nuevo del backend → se muestra tal cual, en tono neutro. */
export const orderStatusInfo = (status: string): (typeof ORDER_STATUS)[OrderStatus] =>
  isOrderStatus(status) ? ORDER_STATUS[status] : { label: status, tone: 'neutral' }
