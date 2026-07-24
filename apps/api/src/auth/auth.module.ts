import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { HashModule } from '../infrastructure/hash/hash.module';
import { AuthController } from './auth.controller';
import { RefreshTokenService } from './services/refresh-token.service';
import { UserSessionService } from './services/user-session.service';
import { AccessControlModule } from './access-control.module';

@Module({
  providers: [AuthService, RefreshTokenService, UserSessionService],
  imports: [UsersModule, HashModule, AccessControlModule],
  controllers: [AuthController],
})
export class AuthModule {}
