import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsOptional()
  @IsEmail()
  guest_email?: string;

  @IsString()
  @IsNotEmpty()
  shipping_full_name: string;

  @IsString()
  @IsNotEmpty()
  shipping_phone: string;

  @IsString()
  @IsNotEmpty()
  shipping_street: string;

  @IsString()
  @IsNotEmpty()
  shipping_city: string;

  @IsString()
  @IsNotEmpty()
  shipping_postal_code: string;
}
