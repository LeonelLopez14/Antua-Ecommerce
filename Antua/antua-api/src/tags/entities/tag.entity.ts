import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { ProductTag } from 'src/products/entities/product-tag.entity';

@Entity('tags')
export class Tag {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50 })
    name: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    slug: string;

    @OneToMany(() => ProductTag, (productTag) => productTag.tag)
    productTags: ProductTag[];
}