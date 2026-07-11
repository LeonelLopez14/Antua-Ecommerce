/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/product.dto';
import { UpdateProductDto } from './dto/update-producto.dto';

@Injectable()
export class ProductsService {

    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) {}

    //Metodo para obtener todos los productos con sus relaciones
    async findAll() {
        const products = await this.productRepository.find({
            where: { is_active: true },
            relations: {
                variants: true,
                images: true,
                productTags: {
                    tag: true,
                },
            },
        });

        if (!products) {
            throw new NotFoundException('No se encontraron productos activos');
        }
        return products;
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
            throw new NotFoundException('Producto no encontrado');
        }
        return product;
    }

    // metodo para crear un producto
    async create(dto: CreateProductDto) {
        const newProduct = this.productRepository.create(dto);

        if (!newProduct) {
            throw new NotFoundException('No se pudo crear el producto');
        }

        return await this.productRepository.save(newProduct);
    }

    //Metodo para actualizar un producto mediante id
    async update(id: number, dto: UpdateProductDto) {
        const product = await this.productRepository.findOne({
            where: { id },
        });

        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }

        Object.assign(product, dto);

        return this.productRepository.save(product);
    }

    //metodo para eliminar un producto
    async remove(id: number) {
        const product = await this.productRepository.delete(id);

        if (product.affected === 0) {
            throw new NotFoundException('No se encontro el producto.');
        }

        return {
            message: 'Producto eliminado correctamente.',
        };
    }
}