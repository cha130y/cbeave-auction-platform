import { Module } from '@nestjs/common';
import { JwtInfrastructureModule } from '../infrastructure/jwt/jwt-infrastructure.module';
import { AccessTokenService } from './services/access-token.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [JwtInfrastructureModule],
  providers: [AccessTokenService, AccessTokenGuard, RolesGuard],
  exports: [AccessTokenService, AccessTokenGuard, RolesGuard],
})
export class AccessControlModule {}
