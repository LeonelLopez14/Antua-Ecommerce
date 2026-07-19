import { Injectable } from '@nestjs/common';
import { Cart } from './entities/cart.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
  ) {}

  async getOrCreateCart(userId?: number, guestToken?: string) {
    // ==========================
    // Usuario autenticado
    // ==========================
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

    // ==========================
    // Invitado con guest token
    // ==========================
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

    // ==========================
    // Invitado sin guest token
    // ==========================
    const token = randomUUID();

    const newCart = this.cartRepository.create({
      guest_token: token,
    });

    return this.cartRepository.save(newCart);
  }

  async addItem ()
}
