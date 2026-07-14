import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CartItem } from './cart-item.entity';
import { Coupon } from '../../coupons/entities/coupon.entity';

@Entity('carts')
export class Cart {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.cart, { nullable: true })
  @JoinColumn()
  user: User;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  guest_token: string;

  @ManyToOne(() => Coupon, { nullable: true })
  coupon: Coupon;

  @OneToMany(() => CartItem, (item) => item.cart)
  items: CartItem[];
}
