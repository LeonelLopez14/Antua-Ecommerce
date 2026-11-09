/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateProductDto } from './dto/product.dto';
import { UpdateProductDto } from './dto/update-producto.dto';
import { ProductFilterDto, ProductSort } from './dto/product-filter.dto';

const DEFAULT_PAGE_SIZE = 9;

/** Precio "desde" de un producto: el menor entre el base y sus variantes activas, ignorando ceros. */
const FROM_PRICE = `LEAST(
  COALESCE(NULLIF(p.base_price, 0), m.min_price),
  COALESCE(m.min_price, NULLIF(p.base_price, 0))
)`;

const MIN_VARIANT_PRICE = `(
  SELECT v.productId AS productId, MIN(v.price) AS min_price
  FROM product_variants v
  WHERE v.is_active = 1 AND v.price > 0
  GROUP BY v.productId
)`;

// Whitelist: el orden nunca se arma con texto que mande el cliente.
const SORT_ORDER: Record<ProductSort, [string, 'ASC' | 'DESC']> = {
  recommended: ['p.id', 'ASC'],
  price_asc: ['from_price', 'ASC'],
  price_desc: ['from_price', 'DESC'],
  name: ['p.name', 'ASC'],
};

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

        return products;
    }

    // Página de productos activos con filtros. Las facetas siempre describen todo el catálogo activo.
    async findPage(filter: ProductFilterDto) {
        const limit = filter.limit ?? DEFAULT_PAGE_SIZE;
        const baseQuery = () => {
            const qb = this.productRepository
                .createQueryBuilder('p')
                .leftJoin(MIN_VARIANT_PRICE, 'm', 'm.productId = p.id')
                .where('p.is_active = 1');
            if (filter.tags?.length) {
                // Alcanza con que el producto tenga alguna de las categorías elegidas.
                qb.andWhere(
                    `EXISTS (
                        SELECT 1 FROM product_tags pt
                        INNER JOIN tags t ON t.id = pt.tag_id
                        WHERE pt.product_id = p.id AND t.slug IN (:...tags)
                    )`,
                    { tags: filter.tags },
                );
            }
            if (filter.minPrice !== undefined) {
                qb.andWhere(`${FROM_PRICE} >= :minPrice`, { minPrice: filter.minPrice });
            }
            if (filter.maxPrice !== undefined) {
                qb.andWhere(`${FROM_PRICE} <= :maxPrice`, { maxPrice: filter.maxPrice });
            }
            return qb;
        };

        const total = await baseQuery().getCount();
        const totalPages = Math.max(1, Math.ceil(total / limit));
        // Si se pide una página que no existe, se usa la última.
        const page = Math.min(filter.page ?? 1, totalPages);
        const [column, direction] = SORT_ORDER[filter.sort ?? 'recommended'];

        const rows = await baseQuery()
            .select('p.id', 'id')
            .addSelect(FROM_PRICE, 'from_price')
            .orderBy(column, direction)
            .addOrderBy('p.id', 'ASC')
            .offset((page - 1) * limit)
            .limit(limit)
            .getRawMany<{ id: number }>();
        const ids = rows.map((row) => Number(row.id));

        const products = ids.length
            ? await this.productRepository.find({
                  where: { id: In(ids) },
                  relations: { variants: true, images: true, productTags: { tag: true } },
              })
            : [];
        const position = new Map(ids.map((id, index) => [id, index]));
        const items = products.sort(
            (a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0),
        );

        return { items, total, page, limit, totalPages, facets: await this.getFacets() };
    }

    private async getFacets() {
        const tagRows = await this.productRepository
            .createQueryBuilder('p')
            .innerJoin('p.productTags', 'pt')
            .innerJoin('pt.tag', 't')
            .select('t.slug', 'slug')
            .addSelect('COUNT(DISTINCT p.id)', 'count')
            .where('p.is_active = 1')
            .groupBy('t.slug')
            .getRawMany<{ slug: string; count: string }>();

        const bounds = await this.productRepository
            .createQueryBuilder('p')
            .leftJoin(MIN_VARIANT_PRICE, 'm', 'm.productId = p.id')
            .select(`MIN(${FROM_PRICE})`, 'min')
            .addSelect(`MAX(${FROM_PRICE})`, 'max')
            .where('p.is_active = 1')
            .getRawOne<{ min: string | null; max: string | null }>();

        return {
            tagCounts: Object.fromEntries(tagRows.map(({ slug, count }) => [slug, Number(count)])),
            priceMin: bounds?.min == null ? null : Number(bounds.min),
            priceMax: bounds?.max == null ? null : Number(bounds.max),
        };
    }

    //Metodo para obtener un producto por su slug(unico) con sus relaciones
    async findOne(slug: string) {

        // Solo productos a la venta: un inactivo responde 404 igual que uno inexistente.
        const product = await this.productRepository.findOne({
            where: { slug, is_active: true },
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