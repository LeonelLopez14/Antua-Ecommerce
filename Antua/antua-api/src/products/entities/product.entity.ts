import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Review } from '../../reviews/entities/review.entity';

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 155 })
    name: string;

    @OneToMany(() => Review, (review) => review.product)
    reviews: Review[];
}
