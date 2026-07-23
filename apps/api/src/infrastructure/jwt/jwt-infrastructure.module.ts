import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { EnvVariable } from '../../config/env.validation';

@Module({
  imports: [
    NestJwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvVariable, true>) => ({
        secret: configService.get('ACCESS_TOKEN_SECRET', { infer: true }),
        signOptions: {
          expiresIn: configService.get('ACCESS_TOKEN_TTL_SECONDS', {
            infer: true,
          }),
        },
      }),
    }),
  ],
  exports: [NestJwtModule],
})
export class JwtInfrastructureModule {}
