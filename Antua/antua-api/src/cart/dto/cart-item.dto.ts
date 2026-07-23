import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateCartItemDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  variantId: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  quantity: number;
}
