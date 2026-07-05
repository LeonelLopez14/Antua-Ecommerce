import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, OneToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Coupon } from '../../coupons/entities/coupon.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from '../../payments/entities/payment.entity';

export enum OrderStatus {
    PENDING = 'pending',
    PREPARING = 'preparing',
    SHIPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELED = 'canceled',
}

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.orders, { nullable: true })
    user: User; //null = guest user

    @Column({ type: 'varchar', length: 150, nullable: true })
    guest_email: string;

    @ManyToOne(() => Coupon, { nullable: true })
    coupon: Coupon;

    @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
    status: OrderStatus;

    @Column({ type: 'varchar', length: 50, default: 'pending' })
    payment_status: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    shippping_full_name: string;

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

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    total: number;

    @CreateDateColumn()
    created_at: Date;

    @OneToMany(() => OrderItem, (item) => item.order)
    items: OrderItem[];

    @OneToOne(() => Payment, { nullable: true })
    payment: Payment;
}