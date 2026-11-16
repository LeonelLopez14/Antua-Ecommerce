import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Tope de filas por página en todo el panel: ninguna consulta trae la tabla entera. */
export const MAX_PAGE_SIZE = 50;

export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function pageParams(query: PageQueryDto, defaultLimit = 20) {
  const limit = query.limit ?? defaultLimit;
  const page = query.page ?? 1;
  return { page, limit, skip: (page - 1) * limit };
}

export function toPage<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): Page<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
