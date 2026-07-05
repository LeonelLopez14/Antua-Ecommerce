import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToMany,
    OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Address } from '../../addresses/entities/address.entity';
import { Review } from '../../reviews/entities/review.entity';
import { Order } from '../../orders/entities/order.entity';
import { Cart } from '../../cart/entities/cart.entity';

@Entity('users')
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 155 })
    full_name: string;

    @Column({ type: 'varchar', length: 155, unique: true })
    email: string;

    @Column({ type: 'varchar', length: 255 })
    @Exclude()
    password_hash: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string;

    @CreateDateColumn()
    created_at: Date;

    // Relations

    @OneToMany(() => Address, (address) => address.user)
    addresses: Address[];

    @OneToMany(() => Review, (review) => review.user)
    reviews: Review[];

    @OneToMany(() => Order, (order) => order.user)
    orders: Order[];

    @OneToOne(() => Cart, (cart) => cart.user)
    cart: Cart;
}