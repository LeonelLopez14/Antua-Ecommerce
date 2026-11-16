import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { SLUG_PATTERN } from '../slug';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateTagDto {
  @Transform(trim)
  @IsString()
  @Length(2, 50)
  name: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  @Matches(SLUG_PATTERN, {
    message: 'slug: solo minúsculas, números y guiones',
  })
  slug?: string;
}

export class UpdateTagDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 50)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  @Matches(SLUG_PATTERN, {
    message: 'slug: solo minúsculas, números y guiones',
  })
  slug?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
