import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

export class UpdateCartItemDto {
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @Min(1)
  quantity: number;
}
