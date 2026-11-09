import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
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
import { ConfigService } from '@nestjs/config';

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
    private readonly couponRepository: Repository<Coupon>,
    private readonly configService: ConfigService,
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
        product: {
          is_active: true,
        },
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

      return this.getCartResponse(cart.id);
    }

    //si no existe, crea uno nuevo.
    const item = this.cartItemRepository.create({
      cart,
      variant,
      quantity: dto.quantity,
      unit_price_snapshot: variant.price,
    });

    await this.cartItemRepository.save(item);

    return this.getCartResponse(cart.id);
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
        variant: {
          product: true,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('No se encontro el item');
    }

    //no se puede sumar unidades de algo que ya no se vende (bajar o quitar, sí)
    const isActive = item.variant.is_active && item.variant.product.is_active;
    if (!isActive && dto.quantity > item.quantity) {
      throw new BadRequestException(
        'Este producto ya no esta a la venta. Podes quitarlo del carrito.',
      );
    }

    //validar stock
    if (dto.quantity > item.variant.stock) {
      throw new BadRequestException('Stock insuficiente.');
    }

    //actualizar cantidad
    item.quantity = dto.quantity;

    await this.cartItemRepository.save(item);

    return this.getCartResponse(cartId);
  }
  //Eliminar item del carrito
  async removeItem(cartId: number, itemId: number) {
    const result = await this.cartItemRepository.delete({
      id: itemId,
      cart: {
        id: cartId,
      },
    });

    if (result.affected === 0) {
      throw new NotFoundException('Este producto no existe en tu carrito.');
    }

    return this.getCartResponse(cartId);
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
      throw new BadRequestException('El cupon ha expirado o aun no vigente.');
    }
    if (
      coupon.usage_limit !== null &&
      coupon.times_used >= coupon.usage_limit
    ) {
      throw new BadRequestException('El cupon ha alcanzado su limite de uso.');
    }

    const cart = await this.findCartWithItems(cartId);
    if (!cart) {
      throw new NotFoundException('Carrito no encontrado.');
    }

    if (!this.meetsCouponMinimum(cart, coupon)) {
      throw new BadRequestException(
        `El cupon requiere un monto minimo de ${coupon.min_order_amount}.`,
      );
    }

    // update() escribe solo la columna del cupón: save() con el carrito
    // entero también compararía la lista de ítems (ver mergeCarts).
    await this.cartRepository.update(cartId, { coupon: { id: coupon.id } });

    return this.getCartResponse(cartId);
  }
  //metodo remover cupon
  async removeCoupon(cartId: number) {
    const result = await this.cartRepository.update(cartId, { coupon: null });

    if (result.affected === 0) {
      throw new NotFoundException('Carrito no encontrado.');
    }

    return this.getCartResponse(cartId);
  }
  //metodo juntar carritos de invitado y usuario autenticado
  async mergeCarts(userId: number, guestToken: string) {
    if (!guestToken) {
      const cart = await this.getOrCreateCart(userId);
      return this.getCartResponse(cart.id);
    }

    const guestCart = await this.cartRepository.findOne({
      where: {
        guest_token: guestToken,
      },
      relations: {
        items: {
          variant: true,
        },
        coupon: true,
      },
    });

    if (!guestCart) {
      const cart = await this.getOrCreateCart(userId);
      return this.getCartResponse(cart.id);
    }

    const userCart = await this.getOrCreateCart(userId);

    // Todo o nada: si algo falla a mitad (por ejemplo, falta stock), la base
    // vuelve a como estaba y el invitado conserva su carrito.
    await this.cartRepository.manager.transaction(async (manager) => {
      const cartRepo = manager.getRepository(Cart);
      const itemRepo = manager.getRepository(CartItem);

      const fullUserCart = await cartRepo.findOne({
        where: { id: userCart.id },
        relations: { items: { variant: true }, coupon: true },
      });

      if (!fullUserCart) {
        throw new NotFoundException('Carrito no encontrado.');
      }

      for (const guestItem of guestCart.items) {
        const existingItem = fullUserCart.items.find(
          (item) => item.variant.id === guestItem.variant.id,
        );
        if (existingItem) {
          const totalQuantity = existingItem.quantity + guestItem.quantity;
          if (totalQuantity > guestItem.variant.stock) {
            throw new BadRequestException(
              `Stock insuficiente para el producto ${guestItem.variant.name}.`,
            );
          }
          await itemRepo.update(existingItem.id, { quantity: totalQuantity });
          await itemRepo.delete(guestItem.id);
        } else {
          await itemRepo.update(guestItem.id, {
            cart: { id: fullUserCart.id },
          });
        }
      }

      // Antes: save(fullUserCart) con su lista de ítems vieja. TypeORM veía
      // que los ítems recién movidos "no estaban" y les ponía cartId = NULL.
      // update() toca solo la columna del cupón.
      if (!fullUserCart.coupon && guestCart.coupon) {
        await cartRepo.update(fullUserCart.id, {
          coupon: { id: guestCart.coupon.id },
        });
      }

      await cartRepo.delete(guestCart.id);
    });

    return this.getCartResponse(userCart.id);
  }
  //metodos privados / helpers
  //encontrar carrito con iterms y cupon
  private async findCartWithItems(cartId: number) {
    return this.cartRepository.findOne({
      where: {
        id: cartId,
      },
      relations: {
        items: {
          variant: {
            product: {
              images: true,
            },
          },
        },
        coupon: true,
      },
    });
  }

  private getSubtotal(cart: Cart) {
    let subtotal = 0;

    for (const item of cart.items) {
      subtotal += item.quantity * Number(item.unit_price_snapshot);
    }

    return subtotal;
  }

  private meetsCouponMinimum(cart: Cart, coupon: Coupon) {
    return this.getSubtotal(cart) >= Number(coupon.min_order_amount ?? 0);
  }

  // Si al cambiar el carrito el subtotal queda por debajo del mínimo del
  // cupón, el cupón se quita (el mismo control que hace POST /orders).
  private async syncCoupon(cart: Cart) {
    if (cart.coupon && !this.meetsCouponMinimum(cart, cart.coupon)) {
      await this.cartRepository.update(cart.id, { coupon: null });
      cart.coupon = null;
    }
  }

  //Calcular descuento cupon
  private getSummary(cart: Cart) {
    const subtotal = this.getSubtotal(cart);

    let discount = 0;

    if (cart.coupon) {
      if (cart.coupon.discount_type === 'percentage') {
        discount = subtotal * (Number(cart.coupon.discount_value) / 100);
      } else if (cart.coupon.discount_type === 'fixed') {
        discount = Number(cart.coupon.discount_value);
      }
    }

    // Mismo criterio que orders.service.ts: el descuento nunca supera al subtotal.
    discount = Math.min(discount, subtotal);

    // Envío fijo (SHIPPING_FLAT_RATE, validada al arrancar). Carrito vacío: 0.
    const shipping =
      cart.items.length === 0
        ? 0
        : this.configService.getOrThrow<number>('SHIPPING_FLAT_RATE');

    const total = Math.max(subtotal - discount + shipping, 0);

    if (![subtotal, discount, shipping, total].every(Number.isFinite)) {
      throw new InternalServerErrorException(
        'No se pudo calcular el total del carrito.',
      );
    }

    return {
      subtotal,
      discount,
      shipping,
      total,
    };
  }

  //devuelve siempre la misma forma: { cart (con items y producto), summary }
  async getCartResponse(cartId: number) {
    const cart = await this.findCartWithItems(cartId);
    if (!cart) {
      throw new NotFoundException('Carrito no encontrado.');
    }
    await this.syncCoupon(cart);
    return {
      cart,
      summary: this.getSummary(cart),
    };
  }

  /** Actualiza el precio guardado de los ítems cuyo precio cambió (ver OrdersService). */
  async updatePriceSnapshots(
    changes: { cartItemId: number; newPrice: number }[],
  ) {
    for (const { cartItemId, newPrice } of changes) {
      await this.cartItemRepository.update(cartItemId, {
        unit_price_snapshot: newPrice,
      });
    }
  }

  async getCartWithItems(cartId: number) {
    return this.findCartWithItems(cartId);
  }
}
