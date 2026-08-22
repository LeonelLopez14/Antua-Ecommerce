import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Repository } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
import { OrderStatus } from 'src/orders/entities/order.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  async hasPurchased(userId: number, productId: number): Promise<boolean> {
    const count = await this.orderItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .innerJoin('item.variant', 'variant')
      .where('order.user = :userId', { userId })
      .andWhere('varant.product = :productId', { productId })
      .andWhere('order.status = :status', {
        status: OrderStatus.DELIVERED,
      })
      .getCount();

    return count > 0;
  }

  async create(productSlug: string, userId: number, dto: CreateReviewDto) {
    const product = await this.productRepository.findOne({
      where: {
        slug: productSlug,
        is_active: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const hasPurchased = await this.hasPurchased(userId, product.id);

    if (!hasPurchased) {
      throw new ForbiddenException(
        'Debes haber comprado este producto antes para poder resenharlo',
      );
    }

    const existingReview = await this.reviewRepository.findOne({
      where: {
        product: {
          id: product.id,
        },
        user: {
          id: userId,
        },
      },
    });

    if (!existingReview) {
      throw new ConflictException('Ya resenhaste este producto.');
    }

    const review = this.reviewRepository.create({
      ...dto,
      product,
      user: {
        id: userId,
      },
    });

    return this.reviewRepository.save(review);
  }

  async findAllByProdcutSlug(slug: string) {
    const product = await this.productRepository.findOne({
      where: {
        slug,
        is_active: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return this.reviewRepository.find({
      where: {
        product: {
          id: product.id,
        },
      },
      relations: {
        user: true,
      },
    });
  }
}
