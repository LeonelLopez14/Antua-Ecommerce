import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DataSource, EntityManager, In, Not } from 'typeorm';
import { ProductImage } from 'src/products/entities/product-image.entity';
import { ProductTag } from 'src/products/entities/product-tag.entity';
import { ProductVariant } from 'src/products/entities/product-variant.entity';
import { Product } from 'src/products/entities/product.entity';
import { Review } from 'src/reviews/entities/review.entity';
import { Tag } from 'src/tags/entities/tag.entity';
import { AuditService } from '../audit.service';
import { pageParams, toPage } from '../dto/page-query.dto';
import {
  AdminProductQueryDto,
  CreateAdminProductDto,
  CreateVariantDto,
  StockMovementDto,
  UpdateAdminProductDto,
  UpdateVariantDto,
} from './dto/admin-product.dto';
import { detectImageKind, UPLOADED_FILE_NAME } from './image-file';
import { slugify } from './slug';

export const MAX_IMAGES_PER_PRODUCT = 10;
export const UPLOADS_PUBLIC_PREFIX = '/uploads/products/';

const HISTORY_RULE =
  'Tiene pedidos o carritos asociados: se desactivó en lugar de borrarse, para conservar el historial. Solo se borra algo sin historial.';

/** Resultado del borrado: siempre explica qué pasó. */
export interface RemovalResult {
  deleted: boolean;
  deactivated: boolean;
  message: string;
}

/**
 * Stock nuevo según el motivo. Función pura: se prueba sin base.
 * - restock: entran `quantity` unidades.
 * - shrinkage (merma): salen `quantity`; no puede quedar negativo.
 * - adjustment: `quantity` es el stock contado a mano.
 */
export function nextStock(current: number, movement: StockMovementDto): number {
  switch (movement.reason) {
    case 'restock':
      if (movement.quantity < 1) {
        throw new BadRequestException('Una reposición suma al menos 1 unidad.');
      }
      return current + movement.quantity;
    case 'shrinkage':
      if (movement.quantity < 1) {
        throw new BadRequestException('Una merma descuenta al menos 1 unidad.');
      }
      if (movement.quantity > current) {
        throw new ConflictException(
          `La merma (${movement.quantity}) supera el stock actual (${current}).`,
        );
      }
      return current - movement.quantity;
    case 'adjustment':
      return movement.quantity;
  }
}

type Actor = { id: number };

@Injectable()
export class AdminProductsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  private get uploadsDir(): string {
    return join(this.config.getOrThrow<string>('UPLOADS_DIR'), 'products');
  }

  private get lowStock(): number {
    return this.config.getOrThrow<number>('LOW_STOCK_THRESHOLD');
  }

  // ---------- Lectura ----------

  async findPage(query: AdminProductQueryDto) {
    const { page, limit, skip } = pageParams(query);
    const products = this.dataSource.getRepository(Product);
    const qb = products.createQueryBuilder('p');

    if (query.q) {
      qb.andWhere(
        '(p.name LIKE :q OR p.slug LIKE :q OR EXISTS (SELECT 1 FROM product_variants sv WHERE sv.productId = p.id AND sv.sku LIKE :q))',
        {
          q: `%${query.q.replace(/[\\%_]/g, '\\$&')}%`,
        },
      );
    }
    if (query.status)
      qb.andWhere('p.is_active = :active', {
        active: query.status === 'active',
      });
    if (query.tag) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM product_tags pt INNER JOIN tags t ON t.id = pt.tag_id WHERE pt.product_id = p.id AND t.slug = :tag)',
        { tag: query.tag },
      );
    }
    if (query.lowStock) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM product_variants lv WHERE lv.productId = p.id AND lv.is_active = 1 AND lv.stock <= :low)',
        { low: this.lowStock },
      );
    }

    const total = await qb.getCount();
    const direction = query.dir === 'desc' ? 'DESC' : 'ASC';
    qb.select('p.id', 'id');
    if (query.sort === 'stock') {
      qb.addSelect(
        '(SELECT COALESCE(MIN(sv.stock), 0) FROM product_variants sv WHERE sv.productId = p.id AND sv.is_active = 1)',
        'min_stock',
      ).orderBy('min_stock', direction);
    } else {
      qb.orderBy(query.sort === 'id' ? 'p.id' : 'p.name', direction);
    }
    const rows = await qb
      .addOrderBy('p.id', 'ASC')
      .offset(skip)
      .limit(limit)
      .getRawMany<{ id: number }>();
    const ids = rows.map((row) => Number(row.id));

    const found = ids.length
      ? await products.find({
          where: { id: In(ids) },
          relations: {
            variants: true,
            images: true,
            productTags: { tag: true },
          },
        })
      : [];
    const byId = new Map(found.map((product) => [product.id, product]));
    const items = ids
      .map((id) => byId.get(id))
      .filter((product): product is Product => product !== undefined)
      .map((product) => this.toListItem(product));

    return {
      ...toPage(items, total, page, limit),
      lowStockThreshold: this.lowStock,
    };
  }

  private toListItem(product: Product) {
    const active = product.variants.filter((variant) => variant.is_active);
    const primary =
      product.images.find((image) => image.is_primary) ??
      [...product.images].sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      is_active: product.is_active,
      image: primary?.url ?? null,
      tags: product.productTags.map(({ tag }) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
      })),
      variants: [...product.variants]
        .sort((a, b) => a.price - b.price)
        .map(({ id, name, price, stock, is_active, sku }) => ({
          id,
          name,
          price,
          stock,
          is_active,
          sku,
        })),
      lowStock: active.some((variant) => variant.stock <= this.lowStock),
    };
  }

  async findOne(id: number) {
    const product = await this.dataSource.getRepository(Product).findOne({
      where: { id },
      relations: { variants: true, images: true, productTags: { tag: true } },
    });
    if (!product) throw new NotFoundException('Producto no encontrado.');

    const variantIds = product.variants.map((variant) => variant.id);
    const historyByVariant = await this.variantsWithHistory(
      this.dataSource.manager,
      variantIds,
    );

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      ingredients: product.ingredients,
      allergens: product.allergens,
      nutrition_info: product.nutrition_info,
      is_active: product.is_active,
      tags: product.productTags.map(({ tag }) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
      })),
      variants: [...product.variants]
        .sort((a, b) => a.price - b.price)
        .map((variant) => ({
          id: variant.id,
          name: variant.name,
          price: variant.price,
          stock: variant.stock,
          sku: variant.sku,
          is_active: variant.is_active,
          hasHistory: historyByVariant.has(variant.id),
        })),
      images: [...product.images]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(({ id: imageId, url, sort_order, is_primary }) => ({
          id: imageId,
          url,
          sort_order,
          is_primary,
        })),
      hasHistory: historyByVariant.size > 0,
      lowStockThreshold: this.lowStock,
    };
  }

  /** Variantes que aparecen en algún pedido o carrito: esas nunca se borran. */
  private async variantsWithHistory(
    manager: EntityManager,
    variantIds: number[],
  ) {
    if (variantIds.length === 0) return new Set<number>();
    const rows = await manager.query<{ id: number }[]>(
      `SELECT variantId AS id FROM order_items WHERE variantId IN (?)
       UNION SELECT variantId AS id FROM cart_items WHERE variantId IN (?)`,
      [variantIds, variantIds],
    );
    return new Set(rows.map((row) => Number(row.id)));
  }

  // ---------- Producto ----------

  async create(dto: CreateAdminProductDto, actor: Actor) {
    const id = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Product);
      const slug = await this.resolveSlug(manager, dto.slug, dto.name);
      const product = await repo.save(
        repo.create({
          name: dto.name,
          slug,
          description: dto.description,
          ingredients: dto.ingredients,
          allergens: dto.allergens,
          nutrition_info: dto.nutrition_info ?? null,
          // Se recalcula con las variantes (ver syncBasePrice).
          base_price: 0,
          is_active: dto.is_active ?? false,
        }),
      );
      if (dto.tagIds) await this.replaceTags(manager, product.id, dto.tagIds);
      await this.audit.record(
        {
          adminId: actor.id,
          action: 'product.create',
          entity: 'product',
          entityId: product.id,
          changes: { ...dto, slug },
        },
        manager,
      );
      return product.id;
    });
    return this.findOne(id);
  }

  async update(id: number, dto: UpdateAdminProductDto, actor: Actor) {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Product);
      const product = await repo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException('Producto no encontrado.');

      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      const fields = [
        'name',
        'description',
        'ingredients',
        'allergens',
        'nutrition_info',
        'is_active',
      ] as const;
      for (const field of fields) {
        const value = dto[field];
        if (value !== undefined && value !== product[field]) {
          before[field] = product[field];
          after[field] = value;
        }
      }
      if (dto.slug !== undefined && dto.slug !== product.slug) {
        await this.assertSlugFree(manager, dto.slug, id);
        before.slug = product.slug;
        after.slug = dto.slug;
      }
      if (after.is_active === true) await this.assertSellable(manager, id);

      if (Object.keys(after).length > 0) await repo.update(id, after);
      if (dto.tagIds) {
        const previous = await this.replaceTags(manager, id, dto.tagIds);
        if (previous.join() !== [...dto.tagIds].sort((a, b) => a - b).join()) {
          before.tagIds = previous;
          after.tagIds = dto.tagIds;
        }
      }
      if (Object.keys(after).length > 0) {
        await this.audit.record(
          {
            adminId: actor.id,
            action: 'product.update',
            entity: 'product',
            entityId: id,
            changes: { before, after },
          },
          manager,
        );
      }
    });
    return this.findOne(id);
  }

  /** Solo se activa un producto que se pueda comprar: con al menos una variante activa. */
  private async assertSellable(manager: EntityManager, productId: number) {
    const count = await manager.getRepository(ProductVariant).countBy({
      product: { id: productId },
      is_active: true,
    });
    if (count === 0) {
      throw new ConflictException(
        'Para activar el producto, agregá al menos una variante activa.',
      );
    }
  }

  async remove(id: number, actor: Actor): Promise<RemovalResult> {
    const files: string[] = [];
    const result = await this.dataSource.transaction(async (manager) => {
      const product = await manager.getRepository(Product).findOne({
        where: { id },
        relations: { variants: true, images: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException('Producto no encontrado.');

      const variantIds = product.variants.map((variant) => variant.id);
      const history = await this.variantsWithHistory(manager, variantIds);
      const reviews = await manager
        .getRepository(Review)
        .countBy({ product: { id } });

      if (history.size > 0 || reviews > 0) {
        await manager.getRepository(Product).update(id, { is_active: false });
        await manager
          .getRepository(ProductVariant)
          .update({ product: { id } }, { is_active: false });
        await this.audit.record(
          {
            adminId: actor.id,
            action: 'product.deactivate',
            entity: 'product',
            entityId: id,
            changes: { reason: 'history' },
          },
          manager,
        );
        return { deleted: false, deactivated: true, message: HISTORY_RULE };
      }

      files.push(
        ...product.images
          .map((image) => image.file_name)
          .filter((name): name is string => !!name),
      );
      await manager.getRepository(ProductImage).delete({ product: { id } });
      await manager.getRepository(ProductTag).delete({ product: { id } });
      if (variantIds.length)
        await manager
          .getRepository(ProductVariant)
          .delete({ id: In(variantIds) });
      await manager.getRepository(Product).delete(id);
      await this.audit.record(
        {
          adminId: actor.id,
          action: 'product.delete',
          entity: 'product',
          entityId: id,
          changes: { name: product.name, slug: product.slug },
        },
        manager,
      );
      return {
        deleted: true,
        deactivated: false,
        message: 'Producto borrado: no tenía pedidos ni carritos asociados.',
      };
    });
    // Los archivos se borran recién cuando la transacción se confirmó.
    await Promise.all(files.map((name) => this.deleteFile(name)));
    return result;
  }

  private async resolveSlug(
    manager: EntityManager,
    wanted: string | undefined,
    name: string,
  ) {
    if (wanted) {
      await this.assertSlugFree(manager, wanted);
      return wanted;
    }
    const base = slugify(name) || 'producto';
    const repo = manager.getRepository(Product);
    for (let n = 1; n < 100; n++) {
      const candidate = n === 1 ? base : `${base}-${n}`;
      if (!(await repo.existsBy({ slug: candidate }))) return candidate;
    }
    throw new ConflictException(
      'No se pudo generar un slug libre: escribí uno a mano.',
    );
  }

  private async assertSlugFree(
    manager: EntityManager,
    slug: string,
    exceptId?: number,
  ) {
    const taken = await manager
      .getRepository(Product)
      .existsBy(exceptId ? { slug, id: Not(exceptId) } : { slug });
    if (taken)
      throw new ConflictException(`El slug "${slug}" ya lo usa otro producto.`);
  }

  /** Reemplaza los tags del producto. Devuelve los ids que tenía antes (ordenados). */
  private async replaceTags(
    manager: EntityManager,
    productId: number,
    tagIds: number[],
  ) {
    const found = tagIds.length
      ? await manager.getRepository(Tag).countBy({ id: In(tagIds) })
      : 0;
    if (found !== tagIds.length)
      throw new BadRequestException('Alguno de los tags no existe.');

    const links = manager.getRepository(ProductTag);
    const current = await links.find({
      where: { product: { id: productId } },
      relations: { tag: true },
    });
    const previous = current.map((link) => link.tag.id).sort((a, b) => a - b);

    const toRemove = current.filter((link) => !tagIds.includes(link.tag.id));
    if (toRemove.length)
      await links.delete({ id: In(toRemove.map((link) => link.id)) });
    const toAdd = tagIds.filter((tagId) => !previous.includes(tagId));
    if (toAdd.length) {
      await links.insert(
        toAdd.map((tagId) => ({
          product: { id: productId },
          tag: { id: tagId },
        })),
      );
    }
    return previous;
  }

  // ---------- Variantes y stock ----------

  async addVariant(productId: number, dto: CreateVariantDto, actor: Actor) {
    await this.dataSource.transaction(async (manager) => {
      const product = await manager.getRepository(Product).findOne({
        where: { id: productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException('Producto no encontrado.');
      const variants = manager.getRepository(ProductVariant);
      if (
        await variants.existsBy({ product: { id: productId }, name: dto.name })
      ) {
        throw new ConflictException(
          `El producto ya tiene la variante ${dto.name}.`,
        );
      }
      await this.assertSkuFree(manager, dto.sku);
      const variant = await variants.save(
        variants.create({
          ...dto,
          is_active: dto.is_active ?? true,
          product: { id: productId },
        }),
      );
      await this.syncBasePrice(manager, productId);
      await this.audit.record(
        {
          adminId: actor.id,
          action: 'variant.create',
          entity: 'variant',
          entityId: variant.id,
          changes: { productId, ...dto },
        },
        manager,
      );
    });
    return this.findOne(productId);
  }

  async updateVariant(
    productId: number,
    variantId: number,
    dto: UpdateVariantDto,
    actor: Actor,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const variant = await this.lockVariant(manager, productId, variantId);
      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      for (const field of ['price', 'sku', 'is_active'] as const) {
        const value = dto[field];
        const current =
          field === 'price' ? Number(variant.price) : variant[field];
        if (value !== undefined && value !== current) {
          before[field] = current;
          after[field] = value;
        }
      }
      if (typeof after.sku === 'string')
        await this.assertSkuFree(manager, after.sku, variantId);
      if (Object.keys(after).length === 0) return;

      await manager.getRepository(ProductVariant).update(variantId, after);
      await this.syncBasePrice(manager, productId);
      if (after.is_active === false)
        await this.deactivateIfUnsellable(manager, productId);
      await this.audit.record(
        {
          adminId: actor.id,
          action: 'variant.update',
          entity: 'variant',
          entityId: variantId,
          changes: { productId, before, after },
        },
        manager,
      );
    });
    return this.findOne(productId);
  }

  async removeVariant(
    productId: number,
    variantId: number,
    actor: Actor,
  ): Promise<RemovalResult> {
    return this.dataSource.transaction(async (manager) => {
      const variant = await this.lockVariant(manager, productId, variantId);
      const history = await this.variantsWithHistory(manager, [variantId]);
      const repo = manager.getRepository(ProductVariant);

      let result: RemovalResult;
      if (history.size > 0) {
        await repo.update(variantId, { is_active: false });
        result = { deleted: false, deactivated: true, message: HISTORY_RULE };
      } else {
        await repo.delete(variantId);
        result = {
          deleted: true,
          deactivated: false,
          message: 'Variante borrada: no tenía pedidos ni carritos asociados.',
        };
      }
      await this.syncBasePrice(manager, productId);
      await this.deactivateIfUnsellable(manager, productId);
      await this.audit.record(
        {
          adminId: actor.id,
          action: result.deleted ? 'variant.delete' : 'variant.deactivate',
          entity: 'variant',
          entityId: variantId,
          changes: { productId, name: variant.name, sku: variant.sku },
        },
        manager,
      );
      return result;
    });
  }

  async moveStock(
    productId: number,
    variantId: number,
    dto: StockMovementDto,
    actor: Actor,
  ) {
    await this.dataSource.transaction(async (manager) => {
      // Fila bloqueada: si entra un pedido al mismo tiempo, espera y no se pisa el descuento.
      const variant = await this.lockVariant(manager, productId, variantId);
      const stock = nextStock(variant.stock, dto);
      await manager.getRepository(ProductVariant).update(variantId, { stock });
      await this.audit.record(
        {
          adminId: actor.id,
          action: 'stock.move',
          entity: 'variant',
          entityId: variantId,
          changes: {
            productId,
            reason: dto.reason,
            quantity: dto.quantity,
            before: variant.stock,
            after: stock,
            note: dto.note ?? null,
          },
        },
        manager,
      );
    });
    return this.findOne(productId);
  }

  private async lockVariant(
    manager: EntityManager,
    productId: number,
    variantId: number,
  ) {
    const variant = await manager.getRepository(ProductVariant).findOne({
      where: { id: variantId, product: { id: productId } },
      lock: { mode: 'pessimistic_write' },
    });
    if (!variant) throw new NotFoundException('Variante no encontrada.');
    return variant;
  }

  private async assertSkuFree(
    manager: EntityManager,
    sku: string,
    exceptId?: number,
  ) {
    const taken = await manager
      .getRepository(ProductVariant)
      .existsBy(exceptId ? { sku, id: Not(exceptId) } : { sku });
    if (taken) throw new ConflictException(`El SKU "${sku}" ya existe.`);
  }

  /** `base_price` es el precio "desde": el menor de las variantes activas (0 si no hay). */
  private async syncBasePrice(manager: EntityManager, productId: number) {
    await manager.query(
      `UPDATE products SET base_price = COALESCE(
         (SELECT MIN(v.price) FROM product_variants v WHERE v.productId = ? AND v.is_active = 1), 0)
       WHERE id = ?`,
      [productId, productId],
    );
  }

  /** Un producto activo sin variantes activas no se podría comprar: se desactiva. */
  private async deactivateIfUnsellable(
    manager: EntityManager,
    productId: number,
  ) {
    const active = await manager
      .getRepository(ProductVariant)
      .countBy({ product: { id: productId }, is_active: true });
    if (active === 0)
      await manager
        .getRepository(Product)
        .update(productId, { is_active: false });
  }

  // ---------- Imágenes ----------

  async addImage(
    productId: number,
    file: Express.Multer.File | undefined,
    actor: Actor,
  ) {
    if (!file)
      throw new BadRequestException('Elegí una imagen (campo "file").');
    const kind = detectImageKind(file.buffer);
    if (!kind) {
      throw new BadRequestException(
        'La imagen tiene que ser JPEG, PNG o WebP (se revisa el contenido, no la extensión).',
      );
    }
    const fileName = `${randomBytes(16).toString('hex')}.${kind}`;

    await this.dataSource.transaction(async (manager) => {
      const product = await manager.getRepository(Product).findOne({
        where: { id: productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException('Producto no encontrado.');
      const images = manager.getRepository(ProductImage);
      const existing = await images.find({
        where: { product: { id: productId } },
      });
      if (existing.length >= MAX_IMAGES_PER_PRODUCT) {
        throw new ConflictException(
          `Cada producto admite hasta ${MAX_IMAGES_PER_PRODUCT} imágenes.`,
        );
      }

      await mkdir(this.uploadsDir, { recursive: true });
      // 'wx': falla si el archivo ya existe, en vez de pisarlo.
      await writeFile(join(this.uploadsDir, fileName), file.buffer, {
        flag: 'wx',
      });
      try {
        const image = await images.save(
          images.create({
            product: { id: productId },
            url: `${UPLOADS_PUBLIC_PREFIX}${fileName}`,
            file_name: fileName,
            sort_order:
              existing.reduce(
                (max, image) => Math.max(max, image.sort_order),
                0,
              ) + 1,
            is_primary: !existing.some((image) => image.is_primary),
          }),
        );
        await this.audit.record(
          {
            adminId: actor.id,
            action: 'image.create',
            entity: 'product',
            entityId: productId,
            changes: { imageId: image.id, bytes: file.size, kind },
          },
          manager,
        );
      } catch (error) {
        await this.deleteFile(fileName);
        throw error;
      }
    });
    return this.findOne(productId);
  }

  async reorderImages(productId: number, imageIds: number[], actor: Actor) {
    await this.dataSource.transaction(async (manager) => {
      const images = manager.getRepository(ProductImage);
      const current = await images.find({
        where: { product: { id: productId } },
        lock: { mode: 'pessimistic_write' },
      });
      const sameSet =
        current.length === imageIds.length &&
        current.every((image) => imageIds.includes(image.id));
      if (!sameSet)
        throw new BadRequestException(
          'El orden tiene que incluir todas las imágenes del producto, una vez cada una.',
        );
      for (const [index, imageId] of imageIds.entries()) {
        await images.update(imageId, { sort_order: index + 1 });
      }
      await this.audit.record(
        {
          adminId: actor.id,
          action: 'image.reorder',
          entity: 'product',
          entityId: productId,
          changes: { imageIds },
        },
        manager,
      );
    });
    return this.findOne(productId);
  }

  async setPrimaryImage(productId: number, imageId: number, actor: Actor) {
    await this.dataSource.transaction(async (manager) => {
      const images = manager.getRepository(ProductImage);
      const image = await images.findOne({
        where: { id: imageId, product: { id: productId } },
      });
      if (!image) throw new NotFoundException('Imagen no encontrada.');
      await images.update(
        { product: { id: productId } },
        { is_primary: false },
      );
      await images.update(imageId, { is_primary: true });
      await this.audit.record(
        {
          adminId: actor.id,
          action: 'image.primary',
          entity: 'product',
          entityId: productId,
          changes: { imageId },
        },
        manager,
      );
    });
    return this.findOne(productId);
  }

  async removeImage(productId: number, imageId: number, actor: Actor) {
    const fileName = await this.dataSource.transaction(async (manager) => {
      const images = manager.getRepository(ProductImage);
      const image = await images.findOne({
        where: { id: imageId, product: { id: productId } },
      });
      if (!image) throw new NotFoundException('Imagen no encontrada.');
      await images.delete(imageId);
      if (image.is_primary) {
        const next = await images.findOne({
          where: { product: { id: productId } },
          order: { sort_order: 'ASC' },
        });
        if (next) await images.update(next.id, { is_primary: true });
      }
      await this.audit.record(
        {
          adminId: actor.id,
          action: 'image.delete',
          entity: 'product',
          entityId: productId,
          changes: { imageId },
        },
        manager,
      );
      return image.file_name;
    });
    if (fileName) await this.deleteFile(fileName);
    return this.findOne(productId);
  }

  /** Solo borra nombres generados por el servidor: nunca una ruta armada con datos de afuera. */
  private async deleteFile(fileName: string) {
    if (!UPLOADED_FILE_NAME.test(fileName)) return;
    try {
      await unlink(join(this.uploadsDir, fileName));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
