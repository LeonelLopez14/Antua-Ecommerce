import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  Headers,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CartService } from './cart.service';
import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt-auth.guard';
import { CreateCartItemDto } from './dto/cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  //metodo crear carrito
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async cart(
    @Req() req: Request & { user?: { id: number } },
    @Headers('x-guest-token') guestToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.resolveCart(req, guestToken, res);
  }
  //metodo agregar items a carrito
  @Post('items')
  @UseGuards(OptionalJwtAuthGuard)
  async addItem(
    @Body() dto: CreateCartItemDto,
    @Req() req: Request & { user?: { id: number } },
    @Headers('x-guest-token') guestToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cart = await this.resolveCart(req, guestToken, res);
    return this.cartService.addItem(cart, dto);
  }

  //metodo actualizar cantidad de items en carrito
  @Patch('items/:id')
  @UseGuards(OptionalJwtAuthGuard)
  async updateItem(
    @Param('id', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
    @Req() req: Request & { user?: { id: number } },
    @Headers('x-guest-token') guestToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cart = await this.resolveCart(req, guestToken, res);

    return this.cartService.updateItem(cart.id, itemId, dto);
  }
  //metodos privados
  private async resolveCart(
    req: Request & { user?: { id: number } },
    guestToken: string | undefined,
    res: Response,
  ) {
    const cart = await this.cartService.getOrCreateCart(
      req.user?.id,
      guestToken,
    );

    if (cart.guest_token) {
      res.setHeader('X-Guest-Token', cart.guest_token);
    }
    return cart;
  }
}
