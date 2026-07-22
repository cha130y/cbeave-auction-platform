import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { HashModule } from '../infrastructure/hash/hash.module';
import { AuthController } from './auth.controller';

@Module({
  providers: [AuthService],
  imports: [UsersModule, HashModule],
  controllers: [AuthController],
})
export class AuthModule {}
