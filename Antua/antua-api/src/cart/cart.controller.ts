import { Controller, Get, Req, Res, UseGuards, Headers, Post } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CartService } from './cart.service';
import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt-auth.guard';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getCart(
    @Req() req: Request & { user?: { id: number } },
    @Headers('x-guest-token') guestToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cart = await this.cartService.getOrCreateCart(
      req.user?.id,
      guestToken,
    );

    //si el service crea un guest token, se envia al front
    if (cart.guest_token) {
      res.setHeader('X-Guest-Token', cart.guest_token);
    }

    return cart;
  }

}
