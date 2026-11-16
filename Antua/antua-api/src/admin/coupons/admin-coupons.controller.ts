import {
  Body,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import { AdminUser } from '../admin-user.decorator';
import { AdminController } from '../roles.decorator';
import {
  CouponQueryDto,
  CreateCouponDto,
  UpdateCouponDto,
} from './admin-coupon.dto';
import { AdminCouponsService } from './admin-coupons.service';

@AdminController('coupons')
export class AdminCouponsController {
  constructor(private readonly coupons: AdminCouponsService) {}

  @Get()
  findAll(@Query() query: CouponQueryDto) {
    return this.coupons.findPage(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.coupons.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCouponDto, @AdminUser() admin: User) {
    return this.coupons.create(dto, admin);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponDto,
    @AdminUser() admin: User,
  ) {
    return this.coupons.update(id, dto, admin);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @AdminUser() admin: User) {
    return this.coupons.remove(id, admin);
  }
}
