import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EnvVariable } from '../../config/env.validation';
import { RefreshTokenService } from './refresh-token.service';
import { CreateUserSessionResult } from '../types/create-user-session-result.type';
import { RotateUserSessionResult } from '../types/rotate-user-session-result.type';
import { UserStatus } from '../../generated/prisma/enums';

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

    const expiresAt = this.createExpiresAt();

    // const expiresAt = new Date(
    //   Date.now() + refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    // );

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

  async rotate(
    currentRefreshToken: string,
  ): Promise<RotateUserSessionResult | null> {
    const currentTokenHash = this.refreshTokenService.hash(currentRefreshToken);

    const now = new Date();

    const session = await this.prisma.userSession.findUnique({
      where: {
        refreshTokenHash: currentTokenHash,
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            role: true,
            status: true,
          },
        },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== UserStatus.ACTIVE
    ) {
      return null;
    }

    const newRefreshToken = this.refreshTokenService.generate();
    const newRefreshTokenHash = this.refreshTokenService.hash(newRefreshToken);
    const newExpiresAt = this.createExpiresAt();

    const updateResult = await this.prisma.userSession.updateMany({
      where: {
        id: session.id,
        refreshTokenHash: currentTokenHash,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: newExpiresAt,
      },
    });
    if (updateResult.count !== 1) {
      return null;
    }

    return {
      sessionId: session.id,
      userId: session.userId,
      userRole: session.user.role,
      refreshToken: newRefreshToken,
      expiresAt: newExpiresAt,
    };
  }

  async revokeByRefreshToken(refreshToken: string): Promise<void> {
    const refreshTokenHash = this.refreshTokenService.hash(refreshToken);

    await this.prisma.userSession.updateMany({
      where: {
        refreshTokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private createExpiresAt(): Date {
    const refreshTokenTtlDays = this.configService.get(
      'REFRESH_TOKEN_TTL_DAYS',
      { infer: true },
    );

    return new Date(Date.now() + refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  }
}
