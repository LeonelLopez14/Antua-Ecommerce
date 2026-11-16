import type { SummaryLine, SummaryTotals } from '../components/checkout/OrderSummary'
import type { Order } from '../types/order'

/** Líneas del resumen a partir de un pedido: nombre y precio al momento de la compra (snapshot). */
export const orderSummaryLines = (order: Order): SummaryLine[] =>
  order.items.map((item) => ({
    key: item.id,
    name: item.productName,
    variantName: item.variantName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    imageUrl: null,
  }))

/** Totales que guardó el backend al crear el pedido. */
export const orderSummaryTotals = (order: Order): SummaryTotals => ({
  subtotal: order.subtotal,
  discount: order.discount,
  shipping: order.shippingAmount,
  total: order.total,
  shippingEtaDays: order.shippingEtaDays,
})
