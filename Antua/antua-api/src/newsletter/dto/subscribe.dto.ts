import { IsEmail, MaxLength } from 'class-validator';

export class SubscribeDto {
  @IsEmail()
  @MaxLength(155)
  email: string;
}
