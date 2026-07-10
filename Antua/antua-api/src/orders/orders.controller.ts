import { Controller } from '@nestjs/common';
import { ProductsService } from 'src/products/products.service';

@Controller('orders')
export class OrdersController {

    constructor(private readonly productSerivice: ProductsService) {}
}
