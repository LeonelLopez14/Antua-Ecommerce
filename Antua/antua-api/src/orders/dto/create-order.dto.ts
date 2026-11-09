import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateOrderDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  guest_email?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  shipping_full_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  shipping_phone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  shipping_street: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  shipping_city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  shipping_postal_code: string;
}
