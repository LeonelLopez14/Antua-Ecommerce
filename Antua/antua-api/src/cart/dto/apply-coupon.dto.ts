import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ApplyCouponDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  couponCode: string;
}
