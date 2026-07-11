import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {

    @IsString()
    @IsOptional()
    name: string;

    @IsString()
    @IsOptional()
    slug: string;

    @IsString()
    @IsOptional()
    ingredients: string;

    @IsString()
    @IsOptional()
    allergens: string;

    @IsString()
    @IsOptional()
    description: string;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    base_price: number;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    is_active: boolean;

}