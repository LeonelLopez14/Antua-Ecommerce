import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_variants')
export class ProductVariant {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50 })
    name: string; //ej: "x1", "x6", "x12"

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column({ type: 'int' })
    stock: number;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @Column({ type: 'varchar', length: 255, unique: true })
    sku: string; //ej: "SKU-001", "SKU-002"

    //relations

    @ManyToOne(() => Product, (product) => product.variants)
    product: Product;
    
}
