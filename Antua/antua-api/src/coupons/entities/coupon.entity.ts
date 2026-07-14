import { Cart } from 'src/cart/entities/cart.entity';
import { Order } from 'src/orders/entities/order.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 50 })
  discount_type: string; // "percentage" or "fixed"

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discount_value: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  min_order_amount: number;

  @Column({ type: 'int' })
  usage_limit: number;

  @Column({ type: 'timestamp' })
  valid_until: Date;

  @Column({ type: 'timestamp' })
  valid_from: Date;

  @Column({ type: 'int', default: 0 })
  times_used: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  //relations

  @OneToMany(() => Order, (order) => order.coupon)
  orders: Order[];

  @OneToMany(() => Cart, (cart) => cart.coupon)
  carts: Cart[];
}
