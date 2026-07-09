import { Injectable } from '@nestjs/common';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ProductsService {

    constructor(
        @InjectRepository(Product)
        private readonly productRespository: Repository<Product>,
    ) {}

    findAll() {
        return this.productRespository.find({
            relations: {
                variants: true,
                images: true,
                productTags: {
                    tag: true,
                },
            },
        });
    }
}
