import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  street: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postal_code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  country: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
