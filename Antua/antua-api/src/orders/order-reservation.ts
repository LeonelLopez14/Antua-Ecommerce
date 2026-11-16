import { EntityManager } from 'typeorm';
import { Coupon } from 'src/coupons/entities/coupon.entity';
import { ProductVariant } from 'src/products/entities/product-variant.entity';
import { OrderItem } from './entities/order-item.entity';

/**
 * Devuelve lo que un pedido reservó al crearse: el stock de cada ítem y el uso del cupón.
 * Es la única implementación: la usan el vencimiento de pagos (PaymentExpirationService)
 * y la cancelación desde el panel. Corre dentro de la transacción de quien cancela, que
 * ya tiene la fila del pedido bloqueada.
 */
export async function releaseOrderReservation(
  manager: EntityManager,
  order: { id: number; coupon: { id: number } | null },
): Promise<void> {
  const items = await manager.getRepository(OrderItem).find({
    where: { order: { id: order.id } },
    relations: { variant: true },
  });
  for (const item of items) {
    await manager
      .getRepository(ProductVariant)
      .increment({ id: item.variant.id }, 'stock', item.quantity);
  }
  if (order.coupon) {
    await manager
      .getRepository(Coupon)
      .decrement({ id: order.coupon.id }, 'times_used', 1);
  }
}
