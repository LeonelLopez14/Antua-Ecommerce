import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  ParseIntPipe,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  //metodo crear order
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async createOrder(
    @Body() dto: CreateOrderDto,
    @Req() req: Request & { user?: { id: number } },
    @Headers('x-guest-token') guestToken: string | undefined,
  ) {
    return this.ordersService.createOrder(req.user?.id, guestToken, dto);
  }

  //Metodo encontrar
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAllByUser(@Req() req: Request & { user: { id: number } }) {
    return this.ordersService.findAllByUser(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id', ParseIntPipe) orderId: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.ordersService.findOne(orderId, req.user.id);
  }

  // El token va en un header (no en la URL) para que no quede en logs ni en el historial.
  @Get('guest/:id')
  async findGuestOrder(
    @Param('id', ParseIntPipe) orderId: number,
    @Headers('x-order-token') accessToken: string | undefined,
  ) {
    return this.ordersService.findGuestOrder(orderId, accessToken);
  }

  @Post(':id/claim')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async claim(
    @Param('id', ParseIntPipe) orderId: number,
    @Req() req: Request & { user: { id: number } },
    @Headers('x-order-token') accessToken: string | undefined,
  ) {
    return this.ordersService.claimGuestOrder(
      orderId,
      req.user.id,
      accessToken,
    );
  }
}
