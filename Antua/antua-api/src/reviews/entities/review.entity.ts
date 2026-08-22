import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('reviews')
@Unique(['product', 'user'])
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'int' })
  rating: number; //1 a 5

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Product, (product) => product.reviews)
  product: Product;

  @ManyToOne(() => User, (user) => user.reviews)
  user: User;
}
