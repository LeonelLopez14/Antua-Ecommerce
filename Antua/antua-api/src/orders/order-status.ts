import { OrderStatus } from './entities/order.entity';
import { PaymentStatus } from 'src/payments/payment-state';

/**
 * Máquina de estados de `orders.status` (logística). El pago es aparte (`payment_status`,
 * ver src/payments/payment-state.ts) y el panel nunca lo cambia.
 *
 *   pending ──► preparing ──► shipped ──► delivered
 *      │            │
 *      └──► canceled ◄┘
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PREPARING, OrderStatus.CANCELED],
  [OrderStatus.PREPARING]: [OrderStatus.SHIPPED, OrderStatus.CANCELED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELED]: [],
};

const LABEL: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'pendiente',
  [OrderStatus.PREPARING]: 'en preparación',
  [OrderStatus.SHIPPED]: 'enviado',
  [OrderStatus.DELIVERED]: 'entregado',
  [OrderStatus.CANCELED]: 'cancelado',
};

interface OrderState {
  status: OrderStatus;
  payment_status: string;
  /** null: el pedido se hizo sin pago en línea (pagos deshabilitados): el cobro se coordina aparte. */
  payment_expires_at: Date | null;
}

/** Pagado en línea, o sin pago en línea (se coordina por fuera). */
export const isPaidOrOffline = (order: OrderState): boolean =>
  order.payment_status === PaymentStatus.PAID ||
  (order.payment_expires_at === null &&
    order.payment_status === PaymentStatus.PENDING);

/** Devuelve null si la transición vale; si no, el motivo para el 409. Pura: se prueba sin base. */
export function transitionError(
  order: OrderState,
  to: OrderStatus,
): string | null {
  if (order.status === to) return `El pedido ya está ${LABEL[to]}.`;
  if (!ORDER_TRANSITIONS[order.status].includes(to)) {
    const allowed = ORDER_TRANSITIONS[order.status].map(
      (status) => LABEL[status],
    );
    return allowed.length === 0
      ? `Un pedido ${LABEL[order.status]} ya no cambia de estado.`
      : `Un pedido ${LABEL[order.status]} solo puede pasar a: ${allowed.join(' o ')}.`;
  }
  if (to === OrderStatus.PREPARING && !isPaidOrOffline(order)) {
    return 'El pago todavía no está aprobado: no se puede preparar el pedido.';
  }
  return null;
}

export const allowedTransitions = (order: OrderState): OrderStatus[] =>
  ORDER_TRANSITIONS[order.status].filter(
    (to) => transitionError(order, to) === null,
  );
