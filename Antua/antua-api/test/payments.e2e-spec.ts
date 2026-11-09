import { createHmac, randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Order } from 'src/orders/entities/order.entity';
import { Payment } from 'src/payments/entities/payment.entity';
import { PaymentExpirationService } from 'src/payments/payment-expiration.service';
import { ProductVariant } from 'src/products/entities/product-variant.entity';
import {
  SimulatedStatus,
  simulatedPaymentId,
} from 'src/payments/simulated.provider';
import { Coupon } from 'src/coupons/entities/coupon.entity';
import {
  createCoupon,
  createProduct,
  createTestApp,
  newGuestToken,
  registerUser,
  resetDatabase,
  SHIPPING_DATA,
  TestApp,
} from './helpers';

const SECRET = 'secreto-de-prueba-para-los-e2e';

describe('pagos', () => {
  let app: TestApp;
  let db: DataSource;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });
  beforeEach(() => resetDatabase(db));
  afterAll(() => app.close());

  const server = () => app.getHttpServer();

  const guestOrder = async (price = 1000, coupon?: string) => {
    const { variant } = await createProduct(db, `p-${randomUUID()}`, price, 10);
    const token = await newGuestToken(app);
    await request(server())
      .post('/cart/items')
      .set('X-Guest-Token', token)
      .send({ variantId: variant.id, quantity: 2 })
      .expect(201);
    if (coupon) {
      await request(server())
        .post('/cart/coupon')
        .set('X-Guest-Token', token)
        .send({ couponCode: coupon })
        .expect(201);
    }
    const res = await request(server())
      .post('/orders')
      .set('X-Guest-Token', token)
      .send({ ...SHIPPING_DATA, guest_email: 'a@antua.test' })
      .expect(201);
    const body = res.body as {
      order: { id: number; total: number };
      accessToken: string;
    };
    return { ...body, variant };
  };

  const start = (orderId: number, token: string) =>
    request(server())
      .post(`/orders/${orderId}/payment`)
      .set('X-Order-Token', token);

  const webhook = (
    dataId: string,
    { secret = SECRET, type = 'payment' } = {},
  ) => {
    const requestId = randomUUID();
    const ts = Math.floor(Date.now() / 1000);
    const v1 = createHmac('sha256', secret)
      .update(`id:${dataId};request-id:${requestId};ts:${ts};`)
      .digest('hex');
    return request(server())
      .post(`/payments/webhook?data.id=${dataId}&type=${type}`)
      .set('x-signature', `ts=${ts},v1=${v1}`)
      .set('x-request-id', requestId)
      .send({ type, action: 'payment.updated', data: { id: dataId } });
  };

  const notify = (orderId: number, status: SimulatedStatus) =>
    webhook(simulatedPaymentId(orderId, status));

  const stored = (id: number) =>
    db.getRepository(Order).findOneByOrFail({ id });

  it('informa que los pagos están activos', async () => {
    const res = await request(server()).get('/payments/config').expect(200);
    expect(res.body).toEqual({ enabled: true });
  });

  describe('crear el pago', () => {
    it('devuelve la URL de pago e ignora cualquier monto que mande el cliente', async () => {
      const { order, accessToken } = await guestOrder(1000);
      const res = await start(order.id, accessToken)
        .send({ amount: 1, total: 1 })
        .expect(201);
      expect((res.body as { redirectUrl: string }).redirectUrl).toContain(
        `external_reference=order-${order.id}`,
      );
      // El monto correcto (2000 + 1500) es el que se valida al confirmar.
      await notify(order.id, 'approved').expect(200);
      expect((await stored(order.id)).payment_status).toBe('paid');
    });

    it('solo deja pagar al dueño', async () => {
      const { order } = await guestOrder();
      const user = await registerUser(app, 'otra@antua.test');
      await request(server()).post(`/orders/${order.id}/payment`).expect(404);
      await start(order.id, 'token-inventado').expect(404);
      await request(server())
        .post(`/orders/${order.id}/payment`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(404);
      await request(server()).get(`/orders/${order.id}/payment`).expect(404);
    });

    it('no deja pagar un pedido ya pagado', async () => {
      const { order, accessToken } = await guestOrder();
      await start(order.id, accessToken).expect(201);
      await notify(order.id, 'approved').expect(200);
      await start(order.id, accessToken).expect(409);
    });
  });

  describe('webhook', () => {
    it('rechaza una firma inválida sin tocar el pedido', async () => {
      const { order, accessToken } = await guestOrder();
      await start(order.id, accessToken).expect(201);
      await webhook(simulatedPaymentId(order.id, 'approved'), {
        secret: 'otra-clave',
      }).expect(401);
      await request(server())
        .post(
          `/payments/webhook?data.id=${simulatedPaymentId(order.id, 'approved')}`,
        )
        .send({ type: 'payment' })
        .expect(401);
      expect((await stored(order.id)).payment_status).toBe('pending');
    });

    it('es idempotente: el mismo evento dos veces no duplica nada', async () => {
      const { order, accessToken } = await guestOrder();
      await start(order.id, accessToken).expect(201);
      await notify(order.id, 'approved').expect(200);
      await notify(order.id, 'approved').expect(200);

      expect(await db.getRepository(Payment).count()).toBe(1);
      expect((await stored(order.id)).payment_status).toBe('paid');
    });

    it('con eventos simultáneos también queda una sola fila', async () => {
      const { order, accessToken } = await guestOrder();
      await start(order.id, accessToken).expect(201);
      const results = await Promise.all(
        [1, 2, 3].map(() => notify(order.id, 'approved')),
      );
      expect(results.map((res) => res.status)).toEqual([200, 200, 200]);
      expect(await db.getRepository(Payment).count()).toBe(1);
    });

    it('no marca como pagado si el monto no coincide', async () => {
      const { order, accessToken } = await guestOrder();
      await start(order.id, accessToken).expect(201);
      await notify(order.id, 'mismatch').expect(200);

      expect((await stored(order.id)).payment_status).toBe('pending');
      const [payment] = await db.getRepository(Payment).find();
      expect(payment.status).toBe('amount_mismatch');
      expect(payment.paid_at).toBeNull();
    });

    it('un rechazo deja reintentar y un aprobado posterior lo paga', async () => {
      const { order, accessToken } = await guestOrder();
      await start(order.id, accessToken).expect(201);
      await notify(order.id, 'rejected').expect(200);
      expect((await stored(order.id)).payment_status).toBe('failed');

      await request(server())
        .post(`/orders/${order.id}/payment/retry`)
        .set('X-Order-Token', accessToken)
        .expect(201);
      expect((await stored(order.id)).payment_status).toBe('pending');

      await notify(order.id, 'approved').expect(200);
      expect((await stored(order.id)).payment_status).toBe('paid');
      expect(await db.getRepository(Payment).count()).toBe(2);
    });

    it('la URL de retorno no marca nada: el estado sale del proveedor', async () => {
      const { order, accessToken } = await guestOrder();
      await start(order.id, accessToken).expect(201);
      const pending = await request(server())
        .get(
          `/orders/${order.id}/payment?payment_id=${simulatedPaymentId(order.id, 'pending')}&status=approved`,
        )
        .set('X-Order-Token', accessToken)
        .expect(200);
      expect(pending.body).toMatchObject({
        paymentStatus: 'pending',
        canPay: true,
      });

      const approved = await request(server())
        .get(
          `/orders/${order.id}/payment?payment_id=${simulatedPaymentId(order.id, 'approved')}`,
        )
        .set('X-Order-Token', accessToken)
        .expect(200);
      expect(approved.body).toMatchObject({
        paymentStatus: 'paid',
        canPay: false,
      });
    });

    it('confirma sin procesar los avisos de otro tipo', async () => {
      const { order, accessToken } = await guestOrder();
      await start(order.id, accessToken).expect(201);
      await webhook(simulatedPaymentId(order.id, 'approved'), {
        type: 'plan',
      }).expect(200);
      expect((await stored(order.id)).payment_status).toBe('pending');
    });
  });

  describe('vencimiento', () => {
    const expire = (id: number) =>
      db.getRepository(Order).update(id, {
        payment_expires_at: new Date(Date.now() - 1000),
      });
    const runJob = () =>
      app.get(PaymentExpirationService).expireOverdueOrders();

    it('cancela el pedido, devuelve el stock y el uso del cupón', async () => {
      const coupon = await createCoupon(db, 'FIJO');
      const { order, variant } = await guestOrder(1000, 'FIJO');
      await db
        .getRepository(Coupon)
        .findOneByOrFail({ id: coupon.id })
        .then((c) => expect(c.times_used).toBe(1));

      await expire(order.id);
      expect(await runJob()).toBe(1);

      const canceled = await stored(order.id);
      expect(canceled).toMatchObject({
        status: 'canceled',
        payment_status: 'canceled',
      });
      const restored = await db
        .getRepository(ProductVariant)
        .findOneByOrFail({ id: variant.id });
      expect(restored.stock).toBe(10);
      const after = await db
        .getRepository(Coupon)
        .findOneByOrFail({ id: coupon.id });
      expect(after.times_used).toBe(0);

      // Correr la tarea otra vez no devuelve stock de más.
      expect(await runJob()).toBe(0);
    });

    it('no toca un pedido pagado ni uno sin vencer', async () => {
      const paid = await guestOrder();
      await start(paid.order.id, paid.accessToken).expect(201);
      await notify(paid.order.id, 'approved').expect(200);
      await expire(paid.order.id);
      const open = await guestOrder();

      expect(await runJob()).toBe(0);
      expect((await stored(paid.order.id)).status).toBe('pending');
      expect((await stored(open.order.id)).status).toBe('pending');
    });

    it('no deja pagar un pedido vencido y marca para revisión un pago tardío', async () => {
      const { order, accessToken } = await guestOrder();
      await start(order.id, accessToken).expect(201);
      await expire(order.id);
      await start(order.id, accessToken).expect(409);
      await runJob();

      await notify(order.id, 'approved').expect(200);
      expect((await stored(order.id)).payment_status).toBe('paid_after_cancel');
    });
  });
});
