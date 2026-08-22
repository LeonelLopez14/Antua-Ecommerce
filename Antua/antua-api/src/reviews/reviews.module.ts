import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { Product } from 'src/products/entities/product.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Product, OrderItem])],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
