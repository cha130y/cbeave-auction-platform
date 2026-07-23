import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EnvVariable } from '../../config/env.validation';
import { RefreshTokenService } from './refresh-token.service';
import { CreateUserSessionResult } from '../types/create-user-session-result.type';

@Injectable()
export class UserSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvVariable, true>,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async create(userId: string): Promise<CreateUserSessionResult> {
    const refreshToken = this.refreshTokenService.generate();
    const refreshTokenHash = this.refreshTokenService.hash(refreshToken);

    const refreshTokenTtlDays = this.configService.get(
      'REFRESH_TOKEN_TTL_DAYS',
      { infer: true },
    );

    const expiresAt = new Date(
      Date.now() + refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    );

    const session = await this.prisma.userSession.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt,
      },
      select: {
        id: true,
      },
    });
    return {
      sessionId: session.id,
      refreshToken,
      expiresAt,
    };
  }
}
