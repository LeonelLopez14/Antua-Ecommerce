import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsValidNewPassword } from 'src/common/password-policy';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(155)
  full_name: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(155)
  email: string;

  @IsValidNewPassword()
  password: string;
}
