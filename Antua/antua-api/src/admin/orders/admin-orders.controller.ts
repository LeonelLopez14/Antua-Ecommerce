import { Body, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import { AdminUser } from '../admin-user.decorator';
import { AdminController } from '../roles.decorator';
import {
  AdminOrderQueryDto,
  ChangeOrderStatusDto,
  OrderNoteDto,
} from './admin-order.dto';
import { AdminOrdersService } from './admin-orders.service';

/** Sin endpoints para precios, totales ni pago: el panel solo cambia el estado logístico y la nota. */
@AdminController('orders')
export class AdminOrdersController {
  constructor(private readonly orders: AdminOrdersService) {}

  @Get()
  findAll(@Query() query: AdminOrderQueryDto) {
    return this.orders.findPage(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orders.findOne(id);
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeOrderStatusDto,
    @AdminUser() admin: User,
  ) {
    return this.orders.changeStatus(id, dto.status, admin);
  }

  @Patch(':id/note')
  updateNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OrderNoteDto,
    @AdminUser() admin: User,
  ) {
    return this.orders.updateNote(id, dto.note, admin);
  }
}
