import { Module } from '@nestjs/common';
import { JwtInfrastructureModule } from '../infrastructure/jwt/jwt-infrastructure.module';
import { AccessTokenService } from './services/access-token.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { RolesGuard } from './guards/roles.guard';
import { SocketAuthenticationService } from './services/socket-authentication.service';

@Module({
  imports: [JwtInfrastructureModule],
  providers: [
    AccessTokenService,
    AccessTokenGuard,
    RolesGuard,
    SocketAuthenticationService,
  ],
  exports: [
    AccessTokenService,
    AccessTokenGuard,
    RolesGuard,
    SocketAuthenticationService,
  ],
})
export class AccessControlModule {}
