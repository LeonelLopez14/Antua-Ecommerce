import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  ParseIntPipe,
  Headers,
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

  @Get('guest/:id')
  async findGuestOrder(
    @Param('id', ParseIntPipe) orderId: number,
    @Query('email') email: string,
  ) {
    return this.ordersService.findGuestOrder(orderId, email);
  }
}
