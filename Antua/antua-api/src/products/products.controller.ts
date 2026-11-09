import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Patch,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminKeyGuard } from 'src/common/admin-key.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/product.dto';
import { UpdateProductDto } from './dto/update-producto.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { ParseIntPipe } from '@nestjs/common';

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

  @UseGuards(AdminKeyGuard)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @UseGuards(AdminKeyGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @UseGuards(AdminKeyGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(id);
  }
}
