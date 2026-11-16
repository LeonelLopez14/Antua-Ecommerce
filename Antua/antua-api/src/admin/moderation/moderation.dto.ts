import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { UserRole } from 'src/users/entities/user.entity';
import { PageQueryDto } from '../dto/page-query.dto';

const toBool = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class AdminReviewQueryDto extends PageQueryDto {
  /** Nombre del producto o texto del comentario. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  hidden?: boolean;
}

export class ReviewVisibilityDto {
  @IsBoolean()
  is_hidden: boolean;
}

export class AdminUserQueryDto extends PageQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(155)
  q?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
