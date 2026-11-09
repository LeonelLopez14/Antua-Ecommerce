import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(155)
  full_name?: string;

  // Vacío borra el teléfono.
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[0-9+() -]*$/, { message: 'phone has invalid characters' })
  phone?: string;
}
