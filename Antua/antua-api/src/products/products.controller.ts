import { Controller, Get } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {

    constructor(private readonly productSerivice: ProductsService) {}

    @Get()
    findAll() {
        return this.productSerivice.findAll();
    }
}
