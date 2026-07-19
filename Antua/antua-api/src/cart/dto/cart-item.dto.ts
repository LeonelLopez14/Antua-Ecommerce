import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber } from "class-validator";

export class CreateCartItemDto {

@Type(() => Number)
@IsNumber()
@IsNotEmpty()
variantId: number;

@Type(() => Number)
@IsNumber()
@IsNotEmpty()
quantity: number;
}