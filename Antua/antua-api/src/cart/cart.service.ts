import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cart } from './entities/cart.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { CartItem } from './entities/cart-item.entity';
import { ProductVariant } from 'src/products/entities/product-variant.entity';
import { CreateCartItemDto } from './dto/cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Coupon } from 'src/coupons/entities/coupon.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(Coupon)
private readonly couponRepository: Repository<Coupon>;
  ) {}
  //Obtener o crear un carrito
  async getOrCreateCart(userId?: number, guestToken?: string) {
    // Usuario autenticado
    if (userId) {
      const cart = await this.cartRepository.findOne({
        where: {
          user: {
            id: userId,
          },
        },
      });

      if (cart) {
        return cart;
      }

      const newCart = this.cartRepository.create({
        user: {
          id: userId,
        },
      });

      return this.cartRepository.save(newCart);
    }

    // Invitado con guest token
    if (guestToken) {
      const cart = await this.cartRepository.findOne({
        where: {
          guest_token: guestToken,
        },
      });

      if (cart) {
        return cart;
      }

      // El token existe pero el carrito ya no
      const token = randomUUID();

      const newCart = this.cartRepository.create({
        guest_token: token,
      });

      return this.cartRepository.save(newCart);
    }

    // Invitado sin guest token
    const token = randomUUID();

    const newCart = this.cartRepository.create({
      guest_token: token,
    });

    return this.cartRepository.save(newCart);
  }

  //agregar item al carrito
  async addItem(cart: Cart, dto: CreateCartItemDto) {
    //busca la variante
    const variant = await this.productVariantRepository.findOne({
      where: {
        id: dto.variantId,
        is_active: true,
      },
    });

    if (!variant) {
      throw new NotFoundException(
        'El producto no fue encontrado o esta inactivo.',
      );
    }

    //verifica el stock inicial
    if (variant.stock < dto.quantity) {
      throw new BadRequestException('Stock insuficiente.');
    }

    //buscar si ya existe ese producto en el carrito.
    const existingItem = await this.cartItemRepository.findOne({
      where: {
        cart: {
          id: cart.id,
        },
        variant: {
          id: variant.id,
        },
      },
      relations: {
        cart: true,
        variant: true,
      },
    });

    //si existe
    if (existingItem) {
      const newQuantity = existingItem.quantity + dto.quantity;

      if (newQuantity > variant.stock) {
        throw new BadRequestException('Stock insuficiente');
      }

      existingItem.quantity = newQuantity;

      await this.cartItemRepository.save(existingItem);

      const cartId = cart.id;
      if (cartId == null) {
        throw new NotFoundException('Carrito no encontrado.');
      }

      const updatedCart = await this.findCartWithItems(cartId);

      if (!updatedCart) {
        throw new NotFoundException('Carrito no encontrado.');
      }

      return {
        cart: updatedCart,
        summary: this.getSummary(updatedCart),
      };
    }

    //si no existe, crea uno nuevo.
    const item = this.cartItemRepository.create({
      cart,
      variant,
      quantity: dto.quantity,
      unit_price_snapshot: variant.price,
    });

    await this.cartItemRepository.save(item);

    return this.findCartWithItems(cart.id);
  }
  //actualizar cantidad de un item del carrito
  async updateItem(cartId: number, itemId: number, dto: UpdateCartItemDto) {
    //buscar item
    const item = await this.cartItemRepository.findOne({
      where: {
        id: itemId,
        cart: {
          id: cartId,
        },
      },
      relations: {
        variant: true,
      },
    });

    if (!item) {
      throw new NotFoundException('No se encontro el item');
    }

    //validar stock
    if (dto.quantity > item.variant.stock) {
      throw new BadRequestException('Stock insuficiente.');
    }

    //actualizar cantidad
    item.quantity = dto.quantity;

    await this.cartItemRepository.save(item);
    //devolver carrito
    const updatedCart = await this.findCartWithItems(cartId);

    if (!updatedCart) {
      throw new NotFoundException('Carrito no encontrado.');
    }

    return {
      cart: updatedCart,
      summary: this.getSummary(updatedCart),
    };
  }
  //Eliminar item del carrito
  async removeItem(cartId: number, itemId: number) {
    const item = await this.cartItemRepository.findOne({
      where: {
        id: itemId,
        cart: {
          id: cartId,
        },
      },
      relations: {
        variant: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Este producto no exise en tu carrito.');
    }

    await this.cartItemRepository.delete(item.id);

    const updatedCart = await this.findCartWithItems(cartId);

    if (!updatedCart) {
      throw new NotFoundException('Carrito no encontrado.');
    }

    return {
      cart: updatedCart,
      summary: this.getSummary(updatedCart),
    };
  }

//metodo aplicar cupon
  async applyCoupon(cartId: number, couponCode: string) {
    const coupon = await this.couponRepository.findOne({
      where: {
        code: couponCode,
        is_active: true,
      },
    });

    if (!coupon) {
      throw new NotFoundException('El cupon no es valido o no existe.');
    }

    const now = new Date();
    if (coupon.valid_from > now || coupon.valid_until < now) {
      throw new NotFoundException('El cupon ha expirado o aun no vigente.');
    }

    if (coupon.usage_limit !== 0 && coupon.times_used >= coupon.usage_limit) {
      throw new BadRequestException('El cupon ha alcanzado su limite de uso.');
    }

    const cart = await this.findCartWithItems(cartId);
    if (!cart) {
      throw new NotFoundException('Carrito no encontrado.');
    }

    const summary = this.getSummary(cart);

    if (summary.subtotal < Number(coupon.min_order_amount)) {
      throw new BadRequestException(
        `El cupon requiere un monto minimo de ${coupon.min_order_amount}.`,
      );
    }

    cart.coupon = coupon;
    await this.cartRepository.save(cart);

    return {
      cart,
      summary: this.getSummary(cart),
    };
  }
  //metodos privados / helpers
  private async findCartWithItems(cartId: number) {
    return this.cartRepository.findOne({
      where: {
        id: cartId,
      },
      relations: {
        items: {
          variant: true,
        },
        coupon: true,
      },
    });
  }
  //Calcular descuento cupon
  private getSummary(cart: Cart) {
    let subtotal = 0;

    for (const item of cart.items) {
      subtotal += item.quantity * Number(item.unit_price_snapshot);
    }

    let discount = 0;

    if (cart.coupon) {
      if (cart.coupon.discount_type === 'percentage') {
        discount = subtotal * (Number(cart.coupon.discount_value) / 100);
      } else if (cart.coupon.discount_type === 'fixed') {
        discount = Number(cart.coupon.discount_value);
      }
    }

    const total = Math.max(subtotal - discount, 0);

    return {
      subtotal,
      discount,
      total,
    };
  }
}
