import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductFilterDto } from './dto/product-filter.dto';

// Solo lectura. Las escrituras del catálogo están en /admin/products (src/admin/catalog).
@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductsService) {}

  @Get()
  findAll(@Query() filter: ProductFilterDto) {
    // Sin parámetros responde el array de siempre; con parámetros, una página con facetas.
    const hasFilter = Object.values(filter).some(
      (value) => value !== undefined,
    );
    return hasFilter
      ? this.productService.findPage(filter)
      : this.productService.findAll();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.productService.findOne(slug);
  }
}
