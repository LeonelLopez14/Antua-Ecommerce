import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsValidNewPassword } from 'src/common/password-policy';

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(155)
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token: string;

  @IsValidNewPassword()
  newPassword: string;
}
