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

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async createOrder(
    @Body() dto: CreateOrderDto,
    @Req() req: Request & { user?: { id: number } },
    @Headers('x-guest-token') guestToken: string | undefined,
  ) {
    return this.ordersService.createOrder(req.user?.id, guestToken, dto);
  }
}
