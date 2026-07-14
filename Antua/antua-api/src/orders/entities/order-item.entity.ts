import { Column, PrimaryGeneratedColumn, ManyToOne, Entity } from 'typeorm';
import { Order } from './order.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.items)
  order: Order;

  @ManyToOne(() => ProductVariant)
  variant: ProductVariant;

  @Column({ type: 'varchar', length: 155 })
  product_name_snapshot: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unit_price_snapshot: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;
}
