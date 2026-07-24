import { Module } from '@nestjs/common';
import { JwtInfrastructureModule } from '../infrastructure/jwt/jwt-infrastructure.module';
import { AccessTokenService } from './services/access-token.service';
import { AccessTokenGuard } from './guards/access-token.guard';

@Module({
  imports: [JwtInfrastructureModule],
  providers: [AccessTokenService, AccessTokenGuard],
  exports: [AccessTokenService, AccessTokenGuard],
})
export class AccessControlModule {}
