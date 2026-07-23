import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator';

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(320)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password: string;
}
