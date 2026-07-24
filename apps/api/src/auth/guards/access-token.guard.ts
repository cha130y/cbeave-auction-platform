import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AccessTokenService } from '../services/access-token.service';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedRequest } from '../types/authenticated-request.type';
import { AccessTokenPayload } from '../types/access-token-payload.type';
import { UserStatus } from '../../generated/prisma/enums';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly accessTokenService: AccessTokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authorization = request.headers.authorization;
    const parts = authorization?.trim().split(/\s+/) ?? [];

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Missing or invalid access token');
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.accessTokenService.verify(parts[1]);
    } catch {
      throw new UnauthorizedException('Missing or invalid access token');
    }

    if (!payload.sub || !payload.sid) {
      throw new UnauthorizedException('Missing or invalid access token');
    }

    const session = await this.prisma.userSession.findUnique({
      where: {
        id: payload.sid,
      },
      select: {
        userId: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            status: true,
          },
        },
      },
    });
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException('Missing or invalid access token');
    }

    request.authUser = payload;

    return true;
  }
}
