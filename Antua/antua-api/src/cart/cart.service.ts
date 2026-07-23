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

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
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

      return this.findCartWithItems(cart.id);
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
    //validar cantidad
    if (dto.quantity < 1) {
      throw new BadRequestException('Cantidad inválida.');
    }

    //validar stock
    if (dto.quantity > item.variant.stock) {
      throw new BadRequestException('Stock insuficiente.');
    }

    //actualizar cantidad
    item.quantity = dto.quantity;

    await this.cartItemRepository.save(item);
    //devolver carrito
    return this.findCartWithItems(cartId);
  }

  //metodos privados
  private async findCartWithItems(cartId: number) {
    return this.cartRepository.findOne({
      where: {
        id: cartId,
      },
      relations: {
        items: {
          variant: true,
        },
      },
    });
  }
}
