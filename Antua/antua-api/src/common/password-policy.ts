import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Política mínima de contraseñas: de 8 a 72 caracteres (bcrypt ignora lo que pase de 72 bytes),
 * con al menos una letra y un número. Se usa al registrarse y al cambiarla o restablecerla.
 */
export const IsValidNewPassword = () =>
  applyDecorators(
    IsString(),
    MinLength(8),
    MaxLength(72),
    Matches(/[A-Za-z]/, { message: 'password must contain a letter' }),
    Matches(/\d/, { message: 'password must contain a number' }),
  );
