import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Review } from '../../reviews/entities/review.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductImage } from './product-image.entity';
import { ProductTag } from './product-tag.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 155 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 500 })
  ingredients: string;

  @Column({ type: 'varchar', length: 255 })
  allergens: string;

  @Column({ type: 'text' })
  description: string;

  // Opcional: texto libre (por ejemplo "Por galleta: 120 kcal…").
  @Column({ type: 'text', nullable: true })
  nutrition_info: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  base_price: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  //relations

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants: ProductVariant[];

  @OneToMany(() => Review, (review) => review.product)
  reviews: Review[];

  @OneToMany(() => ProductImage, (image) => image.product)
  images: ProductImage[];

  @OneToMany(() => ProductTag, (productTag) => productTag.product)
  productTags: ProductTag[];
}
