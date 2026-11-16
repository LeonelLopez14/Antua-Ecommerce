import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  url: string;

  @Column({ type: 'int' })
  sort_order: number;

  @Column({ type: 'boolean', default: false })
  is_primary: boolean;

  // Nombre del archivo subido (aleatorio, generado por el servidor). null: imagen externa o del seed.
  @Column({ type: 'varchar', length: 100, nullable: true })
  file_name: string | null;

  @ManyToOne(() => Product, (product) => product.images)
  product: Product;
}
