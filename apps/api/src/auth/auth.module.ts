import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { HashModule } from '../infrastructure/hash/hash.module';
import { AuthController } from './auth.controller';
import { AccessTokenService } from './services/access-token.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { UserSessionService } from './services/user-session.service';
import { JwtInfrastructureModule } from '../infrastructure/jwt/jwt-infrastructure.module';

@Module({
  providers: [
    AuthService,
    AccessTokenService,
    RefreshTokenService,
    UserSessionService,
  ],
  imports: [UsersModule, HashModule, JwtInfrastructureModule],
  controllers: [AuthController],
})
export class AuthModule {}
