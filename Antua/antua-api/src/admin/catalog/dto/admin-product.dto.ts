import { applyDecorators } from '@nestjs/common';
import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PageQueryDto } from 'src/admin/dto/page-query.dto';
import { SLUG_PATTERN } from '../slug';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Precio con el formato de la base (decimal 10,2): positivo y con 2 decimales como máximo. */
const IsPrice = () =>
  applyDecorators(
    IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false }),
    IsPositive(),
    Max(99_999_999.99),
  );

export const VARIANT_NAMES = ['x1', 'x6', 'x12'] as const;
export const STOCK_REASONS = ['adjustment', 'restock', 'shrinkage'] as const;
export type StockReason = (typeof STOCK_REASONS)[number];

export class CreateAdminProductDto {
  @Transform(trim)
  @IsString()
  @Length(2, 155)
  name: string;

  /** Opcional: si falta, se genera a partir del nombre. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  @Matches(SLUG_PATTERN, {
    message: 'slug: solo minúsculas, números y guiones (ej: clasica-chips)',
  })
  slug?: string;

  @Transform(trim)
  @IsString()
  @Length(1, 5000)
  description: string;

  @Transform(trim)
  @IsString()
  @Length(1, 500)
  ingredients: string;

  @Transform(trim)
  @IsString()
  @Length(1, 255)
  allergens: string;

  @IsOptional()
  @ValidateIf((_dto, value) => value !== null)
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  nutrition_info?: string | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  tagIds?: number[];
}

export class UpdateAdminProductDto extends PartialType(CreateAdminProductDto) {}

export class CreateVariantDto {
  @IsIn(VARIANT_NAMES)
  name: (typeof VARIANT_NAMES)[number];

  @IsPrice()
  price: number;

  /** Stock inicial. Después solo cambia con un movimiento de stock (con motivo). */
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stock: number;

  @Transform(trim)
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{2,60}$/, {
    message: 'sku: de 2 a 60 letras, números, guiones o guiones bajos',
  })
  sku: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateVariantDto {
  @IsOptional()
  @IsPrice()
  price?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{2,60}$/, {
    message: 'sku: de 2 a 60 letras, números, guiones o guiones bajos',
  })
  sku?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class StockMovementDto {
  @IsIn(STOCK_REASONS)
  reason: StockReason;

  /** restock: unidades que entran. shrinkage: unidades que se pierden. adjustment: stock contado. */
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  quantity: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class ImageOrderDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsInt({ each: true })
  imageIds: number[];
}

export class AdminProductQueryDto extends PageQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @Matches(SLUG_PATTERN)
  tag?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  lowStock?: boolean;

  @IsOptional()
  @IsIn(['name', 'id', 'stock'])
  sort?: 'name' | 'id' | 'stock';

  @IsOptional()
  @Type(() => String)
  @IsIn(['asc', 'desc'])
  dir?: 'asc' | 'desc';
}
