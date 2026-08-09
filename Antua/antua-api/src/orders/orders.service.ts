import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Not, Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { CartService } from 'src/cart/cart.service';
import { ConfigService } from '@nestjs/config';
import { CreateOrderDto } from './dto/create-order.dto';
import { ProductVariant } from 'src/products/entities/product-variant.entity';
import { CartItem } from 'src/cart/entities/cart-item.entity';
import { OrderItem } from './entities/order-item.entity';
import { Coupon } from 'src/coupons/entities/coupon.entity';

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
      //crear order
      for (const cartItem of fullCart.items) {
        const variant = await variantRepo.findOne({
          where: {
            id: cartItem.variant.id,
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
        variant.stock -= cartItem.quantity;

        await variantRepo.save(variant);

        const unitPrice = Number(variant.price);

        subtotal += unitPrice * cartItem.quantity;

        orderItemsData.push({
          variant,
          quantity: cartItem.quantity,
          unitPrice,
        });
      }
      let discount = 0;

      if (fullCart.coupon) {
        const coupon = await couponRepo.findOne({
          where: {
            id: fullCart.coupon.id,
            is_active: true,
          },
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

      const shippingAmount = 
        Number(
          this.configService.get<number>(
            'SHIPPING_FLAT_RATE',
      ),
    );
    });
  }
}
