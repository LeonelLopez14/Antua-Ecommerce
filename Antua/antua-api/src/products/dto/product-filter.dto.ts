import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const PRODUCT_SORTS = [
  'recommended',
  'price_asc',
  'price_desc',
  'name',
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const MAX_PRODUCT_PAGE_SIZE = 48;

/** ?tags=veganas&tags=packs o ?tags=veganas,packs → ['veganas', 'packs'] */
const toTagList = ({ value }: { value: unknown }): unknown => {
  if (value === undefined) return undefined;
  const list: unknown[] = Array.isArray(value) ? value : [value];
  return list.flatMap((item) =>
    typeof item === 'string'
      ? item
          .split(',')
          .map((slug) => slug.trim())
          .filter(Boolean)
      : [item],
  );
};

/** Query de GET /products. Los campos de orden y el tamaño de página están acotados. */
export class ProductFilterDto {
  @IsOptional()
  @Transform(toTagList)
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsIn(PRODUCT_SORTS)
  sort?: ProductSort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PRODUCT_PAGE_SIZE)
  limit?: number;
}
