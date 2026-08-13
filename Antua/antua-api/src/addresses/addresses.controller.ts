import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateAddressDto } from './dto/address.dto';

@Controller('addresses')
export class AddressesController {
    constructor(private readonly addressesService: AddressesService) {}

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async findOne(
        @Param(':id', ParseIntPipe) addressId: number,
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
}
