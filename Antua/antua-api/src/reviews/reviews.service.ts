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
import { UpdateReviewDto } from './dto/update-review.dto';

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
      .andWhere('variant.product = :productId', { productId })
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

    if (existingReview) {
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

  async findAllByProductSlug(slug: string) {
    const product = await this.productRepository.findOne({
      where: {
        slug,
        is_active: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const reviews = await this.reviewRepository.find({
      where: {
        product: {
          id: product.id,
        },
      },
      relations: {
        user: true,
      },
      order: {
        created_at: 'DESC',
      },
    });

    return reviews.map((review) => this.toPublicReview(review));
  }

  /** Solo el autor: para cualquier otro, la reseña "no existe". */
  async update(
    slug: string,
    reviewId: number,
    userId: number,
    dto: UpdateReviewDto,
  ) {
    const review = await this.findOwnReview(slug, reviewId, userId);
    Object.assign(review, dto);
    return this.toPublicReview(await this.reviewRepository.save(review));
  }

  async remove(slug: string, reviewId: number, userId: number) {
    const review = await this.findOwnReview(slug, reviewId, userId);
    await this.reviewRepository.remove(review);
  }

  private async findOwnReview(slug: string, reviewId: number, userId: number) {
    const review = await this.reviewRepository.findOne({
      where: {
        id: reviewId,
        product: { slug },
        user: { id: userId },
      },
      relations: { user: true },
    });

    if (!review) {
      throw new NotFoundException('Resenha no encontrada.');
    }

    return review;
  }

  /** Lo único público del autor es su nombre: nunca el email ni el teléfono. */
  private toPublicReview(review: Review) {
    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      user: { id: review.user.id, full_name: review.user.full_name },
    };
  }
}
