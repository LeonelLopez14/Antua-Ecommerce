import { OrderStatus } from './entities/order.entity';
import { allowedTransitions, transitionError } from './order-status';

const online = (status: OrderStatus, payment_status = 'paid') => ({
  status,
  payment_status,
  payment_expires_at: new Date(),
});

describe('máquina de estados de pedidos', () => {
  it('sigue el camino pendiente → preparación → enviado → entregado', () => {
    expect(
      transitionError(online(OrderStatus.PENDING), OrderStatus.PREPARING),
    ).toBeNull();
    expect(
      transitionError(online(OrderStatus.PREPARING), OrderStatus.SHIPPED),
    ).toBeNull();
    expect(
      transitionError(online(OrderStatus.SHIPPED), OrderStatus.DELIVERED),
    ).toBeNull();
  });

  it('no salta pasos ni vuelve atrás', () => {
    expect(
      transitionError(online(OrderStatus.PENDING), OrderStatus.SHIPPED),
    ).toContain('solo puede pasar a');
    expect(
      transitionError(online(OrderStatus.SHIPPED), OrderStatus.PREPARING),
    ).not.toBeNull();
    expect(
      transitionError(online(OrderStatus.DELIVERED), OrderStatus.CANCELED),
    ).toContain('ya no cambia');
    expect(
      transitionError(online(OrderStatus.CANCELED), OrderStatus.PENDING),
    ).toContain('ya no cambia');
    expect(
      transitionError(online(OrderStatus.PENDING), OrderStatus.PENDING),
    ).toContain('ya está');
  });

  it('se cancela desde pendiente o en preparación, nunca después de enviado', () => {
    expect(
      transitionError(
        online(OrderStatus.PENDING, 'pending'),
        OrderStatus.CANCELED,
      ),
    ).toBeNull();
    expect(
      transitionError(online(OrderStatus.PREPARING), OrderStatus.CANCELED),
    ).toBeNull();
    expect(
      transitionError(online(OrderStatus.SHIPPED), OrderStatus.CANCELED),
    ).not.toBeNull();
  });

  it('solo se prepara un pedido pagado o sin pago en línea', () => {
    expect(
      transitionError(
        online(OrderStatus.PENDING, 'pending'),
        OrderStatus.PREPARING,
      ),
    ).toContain('pago');
    expect(
      transitionError(
        online(OrderStatus.PENDING, 'failed'),
        OrderStatus.PREPARING,
      ),
    ).toContain('pago');
    const offline = {
      status: OrderStatus.PENDING,
      payment_status: 'pending',
      payment_expires_at: null,
    };
    expect(transitionError(offline, OrderStatus.PREPARING)).toBeNull();
    expect(allowedTransitions(online(OrderStatus.PENDING, 'pending'))).toEqual([
      OrderStatus.CANCELED,
    ]);
  });
});
