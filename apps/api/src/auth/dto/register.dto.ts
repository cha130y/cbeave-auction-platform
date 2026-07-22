import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator';
import { Trim } from '../../common/decorators/Trim.decorator';

export class RegisterDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsEmail()
  @MaxLength(320)
  @NormalizeEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  displayName: string;
}
