import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { pageParams, toPage } from './dto/page-query.dto';
import { AuditQueryDto } from './dto/audit-query.dto';
import { User } from 'src/users/entities/user.entity';

export interface AuditEntry {
  adminId: number;
  action: string;
  entity: string;
  entityId: number | null;
  changes?: Record<string, unknown>;
}

const SENSITIVE_KEY = /password|token|hash|secret|card/i;

/** Quita cualquier campo con nombre sensible, aunque llegue anidado. */
export function sanitizeChanges(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeChanges);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SENSITIVE_KEY.test(key))
        .map(([key, inner]) => [key, sanitizeChanges(inner)]),
    );
  }
  return value;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly auditRepository: Repository<AdminAuditLog>,
  ) {}

  /** Con `manager`, la fila se escribe en la misma transacción que el cambio: o quedan los dos o ninguno. */
  async record(entry: AuditEntry, manager?: EntityManager): Promise<void> {
    const repository = manager
      ? manager.getRepository(AdminAuditLog)
      : this.auditRepository;
    const row = new AdminAuditLog();
    row.admin = repository.manager.create(User, { id: entry.adminId });
    row.action = entry.action;
    row.entity = entry.entity;
    row.entity_id = entry.entityId;
    row.changes = entry.changes
      ? (sanitizeChanges(entry.changes) as Record<string, unknown>)
      : null;
    await repository.save(row);
  }

  async findPage(query: AuditQueryDto) {
    const { page, limit, skip } = pageParams(query, 30);
    const qb = this.auditRepository
      .createQueryBuilder('a')
      .leftJoin('a.admin', 'admin')
      .addSelect(['admin.id', 'admin.full_name'])
      .orderBy('a.created_at', 'DESC')
      .addOrderBy('a.id', 'DESC')
      .skip(skip)
      .take(limit);
    if (query.entity)
      qb.andWhere('a.entity = :entity', { entity: query.entity });
    if (query.entityId)
      qb.andWhere('a.entity_id = :entityId', { entityId: query.entityId });
    if (query.action)
      qb.andWhere('a.action = :action', { action: query.action });

    const [rows, total] = await qb.getManyAndCount();
    return toPage(rows, total, page, limit);
  }
}
