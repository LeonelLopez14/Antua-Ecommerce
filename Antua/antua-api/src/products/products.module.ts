import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductTag } from './entities/product-tag.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant, ProductImage, ProductTag])],
  controllers: [ProductsController],
  providers: [ProductsService]
})
export class ProductsModule {}
