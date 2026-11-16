import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PageQueryDto } from '../dto/page-query.dto';

/** " seed 10 " → "SEED10": mayúsculas y sin espacios, así nunca hay dos códigos "iguales". */
export const normalizeCouponCode = (value: unknown): unknown =>
  typeof value === 'string' ? value.toUpperCase().replace(/\s+/g, '') : value;

export const COUPON_STATUSES = [
  'active',
  'inactive',
  'scheduled',
  'expired',
  'exhausted',
] as const;
export type CouponStatus = (typeof COUPON_STATUSES)[number];

export class CreateCouponDto {
  @Transform(({ value }) => normalizeCouponCode(value))
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,50}$/, {
    message: 'code: de 3 a 50 letras, números, guiones o guiones bajos',
  })
  code: string;

  @IsIn(['percentage', 'fixed'])
  discount_type: 'percentage' | 'fixed';

  /** Porcentaje de 1 a 100, o monto fijo. La coherencia con el tipo se valida en el servicio. */
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Max(99_999_999.99)
  discount_value: number;

  @IsOptional()
  @ValidateIf((_dto, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(99_999_999.99)
  min_order_amount?: number | null;

  /** null: sin límite. */
  @IsOptional()
  @ValidateIf((_dto, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  usage_limit?: number | null;

  @IsDateString({ strict: true })
  valid_from: string;

  @IsDateString({ strict: true })
  valid_until: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateCouponDto extends PartialType(CreateCouponDto) {}

export class CouponQueryDto extends PageQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizeCouponCode(value))
  @IsString()
  @MaxLength(50)
  q?: string;

  @IsOptional()
  @IsIn(COUPON_STATUSES)
  status?: CouponStatus;
}
