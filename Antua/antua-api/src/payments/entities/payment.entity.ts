import { Order } from 'src/orders/entities/order.entity';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Order, (order) => order.payment)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'varchar', length: 100 })
  method: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transaction_ref: string;

  @CreateDateColumn()
  paid_at: Date;

  @Column({ type: 'varchar', length: 30 })
  status: string;
}
