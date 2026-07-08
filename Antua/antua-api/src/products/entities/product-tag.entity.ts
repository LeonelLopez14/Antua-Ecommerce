import {  Entity, PrimaryGeneratedColumn, JoinColumn, ManyToOne } from 'typeorm';
import { Product } from './product.entity';
import { Tag } from 'src/tags/entities/tag.entity';

@Entity('product_tags')
export class ProductTag {
    @PrimaryGeneratedColumn()
    id: number;
    
    @ManyToOne(() => Product, (product) => product.productTags)
    @JoinColumn({ name: 'product_id' })
    product: Product;


    @ManyToOne(() => Tag, (tag) => tag.productTags)
    @JoinColumn({ name: 'tag_id' })
    tag: Tag;
}