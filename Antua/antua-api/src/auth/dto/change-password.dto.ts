import { IsNotEmpty, IsString } from 'class-validator';
import { IsValidNewPassword } from 'src/common/password-policy';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsValidNewPassword()
  newPassword: string;
}
