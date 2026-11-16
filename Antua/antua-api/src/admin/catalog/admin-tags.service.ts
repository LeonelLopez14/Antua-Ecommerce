import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Not } from 'typeorm';
import { Tag } from 'src/tags/entities/tag.entity';
import { AuditService } from '../audit.service';
import { CreateTagDto, UpdateTagDto } from './dto/admin-tag.dto';
import { slugify } from './slug';

/** Slugs que usa la Home (categorías rápidas y links): no se borran ni se renombran. */
export const PROTECTED_TAG_SLUGS = [
  'clasicas',
  'sin-gluten',
  'veganas',
  'sin-azucar',
  'packs',
];

type Actor = { id: number };

@Injectable()
export class AdminTagsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async findAll() {
    const rows = await this.dataSource
      .getRepository(Tag)
      .createQueryBuilder('t')
      .select([
        't.id AS id',
        't.name AS name',
        't.slug AS slug',
        't.is_active AS is_active',
      ])
      .addSelect(
        '(SELECT COUNT(*) FROM product_tags pt WHERE pt.tag_id = t.id)',
        'productCount',
      )
      .orderBy('t.name', 'ASC')
      .getRawMany<{
        id: number;
        name: string;
        slug: string;
        is_active: number;
        productCount: string;
      }>();
    return rows.map((tag) => ({
      id: Number(tag.id),
      name: tag.name,
      slug: tag.slug,
      is_active: Boolean(tag.is_active),
      productCount: Number(tag.productCount),
      protected: PROTECTED_TAG_SLUGS.includes(tag.slug),
    }));
  }

  async create(dto: CreateTagDto, actor: Actor) {
    const slug = dto.slug ?? slugify(dto.name);
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Tag);
      if (await repo.existsBy({ slug })) {
        throw new ConflictException(`Ya existe un tag con el slug "${slug}".`);
      }
      const tag = await repo.save(
        repo.create({ name: dto.name, slug, is_active: true }),
      );
      await this.audit.record(
        {
          adminId: actor.id,
          action: 'tag.create',
          entity: 'tag',
          entityId: tag.id,
          changes: { name: dto.name, slug },
        },
        manager,
      );
      return tag;
    });
  }

  async update(id: number, dto: UpdateTagDto, actor: Actor) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Tag);
      const tag = await repo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!tag) throw new NotFoundException('Tag no encontrado.');

      if (dto.slug !== undefined && dto.slug !== tag.slug) {
        if (PROTECTED_TAG_SLUGS.includes(tag.slug)) {
          throw new ConflictException(
            `La Home usa el slug "${tag.slug}": se puede renombrar el tag o desactivarlo, pero no cambiar su slug.`,
          );
        }
        if (await repo.existsBy({ slug: dto.slug, id: Not(id) })) {
          throw new ConflictException(
            `Ya existe un tag con el slug "${dto.slug}".`,
          );
        }
      }

      const before = {
        name: tag.name,
        slug: tag.slug,
        is_active: tag.is_active,
      };
      Object.assign(tag, {
        name: dto.name ?? tag.name,
        slug: dto.slug ?? tag.slug,
        is_active: dto.is_active ?? tag.is_active,
      });
      await repo.save(tag);
      await this.audit.record(
        {
          adminId: actor.id,
          action: 'tag.update',
          entity: 'tag',
          entityId: id,
          changes: {
            before,
            after: { name: tag.name, slug: tag.slug, is_active: tag.is_active },
          },
        },
        manager,
      );
      return tag;
    });
  }
}
