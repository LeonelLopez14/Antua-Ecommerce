import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';

export class CreateCartItemDto {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  variantId: number;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(999)
  quantity: number;
}
