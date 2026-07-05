import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('product_variants')
export class ProductVariant {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50 })
    name: string; //ej: "x1", "x6", "x12"

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;
}
