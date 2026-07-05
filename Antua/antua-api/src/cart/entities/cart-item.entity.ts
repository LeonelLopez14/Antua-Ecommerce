import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Cart } from './cart.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';

@Entity('cart_items')
export class CartItem {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Cart, (cart) => cart.items)
    cart: Cart;

    @ManyToOne(() => ProductVariant)
    variant: ProductVariant;

    @Column({ type: 'int', default: 1 })
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    unit_price_snapshot: number;
}