import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { BcryptService } from '../infrastructure/hash/bcrypt.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly bcryptService: BcryptService,
  ) {}

  async register(dto: RegisterDto): Promise<void> {
    const passwordHash = await this.bcryptService.hash(dto.password);

    await this.usersService.createLocalUser({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      displayName: dto.displayName,
    });
  }
}
