import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { DataSource, Repository } from 'typeorm';
import { CartService } from 'src/cart/cart.service';
import { ConfigService } from '@nestjs/config';
import { CreateOrderDto } from './dto/create-order.dto';
import { ProductVariant } from 'src/products/entities/product-variant.entity';
import { CartItem } from 'src/cart/entities/cart-item.entity';
import { OrderItem } from './entities/order-item.entity';
import { Coupon } from 'src/coupons/entities/coupon.entity';
import { Cart } from 'src/cart/entities/cart.entity';
import {
  generateToken,
  hashToken,
  tokenMatchesHash,
} from 'src/common/secure-token';

/** Un ítem cuyo precio actual ya no es el que mostró el carrito. */
export interface PriceChange {
  cartItemId: number;
  variantId: number;
  productName: string;
  variantName: string;
  oldPrice: number;
  newPrice: number;
}

/** Se lanza dentro de la transacción para revertirla: el pedido no se crea ni se descuenta stock. */
class PriceChangedError extends Error {
  constructor(readonly changes: PriceChange[]) {
    super('Cambiaron los precios del carrito');
  }
}

const toCents = (amount: number): number => Math.round(amount * 100);

/** Plazo para reclamar un pedido de invitado desde la cuenta. */
const CLAIM_WINDOW_MS = 24 * 60 * 60 * 1000;

const ORDER_NOT_FOUND = 'Orden no encontrada.';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly cartService: CartService,
    private readonly configService: ConfigService,
  ) {}

  async createOrder(
    userId: number | undefined,
    guestToken: string | undefined,
    dto: CreateOrderDto,
  ) {
    const cart = await this.cartService.getOrCreateCart(userId, guestToken);
    const fullCart = await this.cartService.getCartWithItems(cart.id);

    //validar carrito
    if (!fullCart || fullCart.items.length === 0) {
      throw new BadRequestException('El carrito está vacío o no existe');
    }
    //validar guest email
    if (!userId && !dto.guest_email) {
      throw new BadRequestException(
        'El email es obligatorio para usuarios invitados',
      );
    }
    //transaccion
    try {
      return await this.placeOrder(fullCart, userId, dto);
    } catch (error) {
      if (!(error instanceof PriceChangedError)) throw error;
      // La transacción ya se revirtió. Recién ahora se guardan los precios nuevos,
      // para que el carrito y la próxima confirmación usen los mismos montos.
      await this.cartService.updatePriceSnapshots(error.changes);
      throw new ConflictException({
        statusCode: 409,
        code: 'PRICE_CHANGED',
        message:
          'Cambió el precio de algunos productos. Revisá el total y confirmá de nuevo.',
        changes: error.changes,
      });
    }
  }

  private placeOrder(
    fullCart: Cart,
    userId: number | undefined,
    dto: CreateOrderDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const variantRepo = manager.getRepository(ProductVariant);
      const orderRepo = manager.getRepository(Order);
      const orderItemRepo = manager.getRepository(OrderItem);
      const cartItemRepo = manager.getRepository(CartItem);
      const couponRepo = manager.getRepository(Coupon);

      let subtotal = 0;

      const orderItemsData: {
        variant: ProductVariant;
        quantity: number;
        unitPrice: number;
      }[] = [];
      const priceChanges: PriceChange[] = [];
      //crear order
      for (const cartItem of fullCart.items) {
        const variant = await variantRepo.findOne({
          where: {
            id: cartItem.variant.id,
          },
          relations: {
            product: true,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (!variant) {
          throw new NotFoundException(
            `La variante ${cartItem.variant.id} no existe.`,
          );
        }

        if (variant.stock < cartItem.quantity) {
          throw new BadRequestException(
            `No hay suficiente stock para la variante ${variant.name}.`,
          );
        }
        if (!variant.is_active || !variant.product.is_active) {
          throw new BadRequestException(
            `La variante ${variant.name} ya no esta a la venta.`,
          );
        }

        // El precio que vale es el que vio el cliente: si cambió, no se cobra sin avisarle.
        const unitPrice = Number(cartItem.unit_price_snapshot);
        const currentPrice = Number(variant.price);
        if (toCents(unitPrice) !== toCents(currentPrice)) {
          priceChanges.push({
            cartItemId: cartItem.id,
            variantId: variant.id,
            productName: variant.product.name,
            variantName: variant.name,
            oldPrice: unitPrice,
            newPrice: currentPrice,
          });
        }

        variant.stock -= cartItem.quantity;

        await variantRepo.save(variant);

        subtotal += unitPrice * cartItem.quantity;

        orderItemsData.push({
          variant,
          quantity: cartItem.quantity,
          unitPrice,
        });
      }
      if (priceChanges.length > 0) throw new PriceChangedError(priceChanges);

      let discount = 0;

      if (fullCart.coupon) {
        const coupon = await couponRepo.findOne({
          where: {
            id: fullCart.coupon.id,
            is_active: true,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (!coupon) {
          throw new BadRequestException('El cupon no es valido.');
        }

        const now = new Date();
        if (coupon.valid_from > now || coupon.valid_until < now) {
          throw new BadRequestException(
            'El cupon ha expirado o aun no esta vigente.',
          );
        }

        if (
          coupon.usage_limit !== null &&
          coupon.times_used >= coupon.usage_limit
        ) {
          throw new BadRequestException(
            'El cupon ha llegado a su limite de uso',
          );
        }

        if (
          coupon.min_order_amount &&
          subtotal < Number(coupon.min_order_amount)
        ) {
          throw new BadRequestException(
            'El pedido no alncanza el minimo requerido para usar el coupon',
          );
        }

        if (coupon.discount_type === 'percentage') {
          discount = subtotal * (Number(coupon.discount_value) / 100);
        }

        if (coupon.discount_type === 'fixed') {
          discount = Number(coupon.discount_value);
        }

        discount = Math.min(discount, subtotal);

        coupon.times_used += 1;

        await couponRepo.save(coupon);
      }

      // Validada al arrancar (src/config/env.validation.ts): siempre es un número.
      const shippingAmount =
        this.configService.getOrThrow<number>('SHIPPING_FLAT_RATE');

      const total = Math.max(subtotal - discount + shippingAmount, 0);

      if (![subtotal, discount, shippingAmount, total].every(Number.isFinite)) {
        throw new InternalServerErrorException(
          'No se pudo calcular el total del pedido.',
        );
      }

      // Solo los invitados: es su única prueba de que este pedido es suyo.
      const accessToken = userId ? null : generateToken();

      //creacion dela order
      const order = orderRepo.create({
        user: userId ? { id: userId } : null,
        guest_email: userId ? null : dto.guest_email,
        guest_access_token_hash: accessToken ? hashToken(accessToken) : null,
        coupon: fullCart.coupon ?? null,
        status: OrderStatus.PENDING,
        payment_status: 'pending',
        shipping_full_name: dto.shipping_full_name,
        shipping_phone: dto.shipping_phone,
        shipping_street: dto.shipping_street,
        shipping_city: dto.shipping_city,
        shipping_postal_code: dto.shipping_postal_code,
        subtotal,
        discount_amount: discount,
        shipping_amount: shippingAmount,
        shipping_eta_days:
          this.configService.get<number | null>('SHIPPING_ETA_DAYS') ?? null,
        total,
      });

      await orderRepo.save(order);

      const orderItems = orderItemsData.map((item) =>
        orderItemRepo.create({
          order,
          variant: item.variant,
          product_name_snapshot: item.variant.product.name,
          unit_price_snapshot: item.unitPrice,
          quantity: item.quantity,
        }),
      );

      await orderItemRepo.save(orderItems);

      await cartItemRepo.delete({
        cart: {
          id: fullCart.id,
        },
      });

      const cartRepo = manager.getRepository(Cart);

      fullCart.coupon = null;

      await cartRepo.save(fullCart);

      return {
        order,
        items: orderItems,
        // Se entrega una sola vez; en la base queda solo el hash.
        accessToken,
      };
    });
  }

  async findAllByUser(userId: number) {
    return this.orderRepository.find({
      where: {
        user: {
          id: userId,
        },
      },
      relations: {
        items: {
          variant: true,
        },
        coupon: true,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findOne(orderId: number, userId: number) {
    const order = await this.orderRepository.findOne({
      where: {
        id: orderId,
        user: {
          id: userId,
        },
      },
      relations: {
        items: {
          variant: true,
        },
        coupon: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada.');
    }

    return order;
  }

  /** Pedido de invitado: requiere el token que se entregó al crearlo (no alcanza con saber el email). */
  async findGuestOrder(orderId: number, accessToken: string | undefined) {
    const order = await this.findGuestOrderWithHash(orderId);

    if (
      !order ||
      !tokenMatchesHash(accessToken, order.guest_access_token_hash)
    ) {
      throw new NotFoundException(ORDER_NOT_FOUND);
    }

    return order;
  }

  /**
   * Vincula un pedido de invitado a la cuenta de quien presenta su token.
   * Nunca se vincula por email: como el email no se verifica, cualquiera podría
   * registrarse con uno ajeno. El token solo lo tiene quien hizo el pedido, sirve
   * una vez y vence. Todas las fallas responden igual para no revelar qué pedidos existen.
   */
  async claimGuestOrder(
    orderId: number,
    userId: number,
    accessToken: string | undefined,
  ) {
    const order = await this.findGuestOrderWithHash(orderId);
    const expired =
      !order || Date.now() - order.created_at.getTime() > CLAIM_WINDOW_MS;

    if (
      !order ||
      expired ||
      order.user ||
      !tokenMatchesHash(accessToken, order.guest_access_token_hash)
    ) {
      throw new NotFoundException(ORDER_NOT_FOUND);
    }

    await this.orderRepository.update(order.id, {
      user: { id: userId },
      guest_email: null,
      guest_access_token_hash: null,
    });

    return this.findOne(order.id, userId);
  }

  private findGuestOrderWithHash(orderId: number) {
    return this.orderRepository
      .createQueryBuilder('o')
      .addSelect('o.guest_access_token_hash')
      .leftJoinAndSelect('o.user', 'user')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('items.variant', 'variant')
      .leftJoinAndSelect('o.coupon', 'coupon')
      .where('o.id = :orderId', { orderId })
      .getOne();
  }
}
