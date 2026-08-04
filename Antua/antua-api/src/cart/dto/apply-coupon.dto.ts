import { IsNotEmpty, IsString } from 'class-validator';

export class ApplyCouponDto {
  @IsNotEmpty()
  @IsString()
  couponCode: string;
}
