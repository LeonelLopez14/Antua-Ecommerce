import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateAddressDto } from './dto/address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAllByUser(@Req() req: Request & { user: { id: number } }) {
    return this.addressesService.findAllByUser(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id', ParseIntPipe) addressId: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.addressesService.findOne(addressId, req.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreateAddressDto,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.addressesService.create(dto, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) addressId: number,
    @Body() dto: UpdateAddressDto,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.addressesService.update(addressId, req.user.id, dto);
  }

  @Patch(':id/default')
  @UseGuards(JwtAuthGuard)
  async setDefault(
    @Param('id', ParseIntPipe) addressId: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.addressesService.setDefault(addressId, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id', ParseIntPipe) addressId: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.addressesService.remove(addressId, req.user.id);
  }
}
