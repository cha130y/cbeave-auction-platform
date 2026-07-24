import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { HashModule } from '../infrastructure/hash/hash.module';
import { AuthController } from './auth.controller';
import { RefreshTokenService } from './services/refresh-token.service';
import { UserSessionService } from './services/user-session.service';
import { AccessControlModule } from './access-control.module';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './social/strategies/google.strategy';
import { GoogleAuthGuard } from './social/guards/google-auth.guard';

@Module({
  providers: [
    AuthService,
    RefreshTokenService,
    UserSessionService,
    GoogleStrategy,
    GoogleAuthGuard,
  ],
  imports: [
    UsersModule,
    HashModule,
    AccessControlModule,
    PassportModule.register({
      session: false,
    }),
  ],
  controllers: [AuthController],
})
export class AuthModule {}
