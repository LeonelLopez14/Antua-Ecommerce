import { IsString, IsNotEmpty, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  ingredients: string;

  @IsString()
  @IsNotEmpty()
  allergens: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  base_price: number;

  @IsBoolean()
  @Type(() => Boolean)
  is_active: boolean;
}
