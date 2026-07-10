import { Injectable, NotFoundException } from '@nestjs/common';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ProductsService {

    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) {}

    //Metodo para obtener todos los productos con sus relaciones
    async findAll() {
        return this.productRepository.find({
            where: { is_active: true },
            relations: {
                variants: true,
                images: true,
                productTags: {
                    tag: true,
                },  
            },
        });
    }

    //Metodo para obtener un producto por su slug(unico) con sus relaciones
    async findOne(slug: string) {

        const product = await this.productRepository.findOne({
            where: { slug },
            relations: {
                variants: true,
                images: true,
                productTags: {
                    tag: true,
                },
                reviews: true,
            },
        });

        if (!product) {
            throw new NotFoundException ('Producto no encontrado');
        }

        return product;
    }


}
