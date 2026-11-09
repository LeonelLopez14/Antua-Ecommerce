import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from '../../users/entities/user.entity';
import { Coupon } from '../../coupons/entities/coupon.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from '../../payments/entities/payment.entity';

export enum OrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150, nullable: true })
  guest_email: string | null;

  // Hash del token que prueba que quien pregunta hizo este pedido de invitado.
  // select: false + @Exclude: nunca sale en una respuesta.
  @Column({ type: 'char', length: 64, nullable: true, select: false })
  @Exclude()
  guest_access_token_hash: string | null;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  // Ver src/payments/payment-state.ts. Es independiente del estado logístico (`status`).
  @Column({ type: 'varchar', length: 50, default: 'pending' })
  payment_status: string;

  // Hasta cuándo se reserva el stock esperando el pago. null: sin vencimiento.
  @Column({ type: 'datetime', nullable: true })
  payment_expires_at: Date | null;

  @Column({ type: 'varchar', length: 200 })
  shipping_full_name: string;

  @Column({ type: 'varchar', length: 50 })
  shipping_phone: string;

  @Column({ type: 'varchar', length: 200 })
  shipping_street: string;

  @Column({ type: 'varchar', length: 100 })
  shipping_city: string;

  @Column({ type: 'varchar', length: 20 })
  shipping_postal_code: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  shipping_amount: number;

  // Plazo estimado al momento de la compra (no cambia si después cambia la configuración).
  @Column({ type: 'int', nullable: true })
  shipping_eta_days: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @CreateDateColumn()
  created_at: Date;

  //relations

  @ManyToOne(() => User, (user) => user.orders, { nullable: true })
  user: User | null; //null = guest user

  @ManyToOne(() => Coupon, { nullable: true })
  coupon: Coupon | null;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments: Payment[];
}
