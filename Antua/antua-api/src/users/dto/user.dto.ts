import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  password_hash: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
