import { Injectable } from '@nestjs/common';
import { AccessTokenService } from './access-token.service';
import { PrismaService } from '../../database/prisma.service';
import type { Socket } from 'socket.io';
import { AccessTokenPayload } from '../types/access-token-payload.type';
import { WsException } from '@nestjs/websockets';
import { UserStatus } from '../../generated/prisma/enums';

@Injectable()
export class SocketAuthenticationService {
  constructor(
    private readonly accessTokenService: AccessTokenService,
    private readonly prisma: PrismaService,
  ) {}

  async authenticate(client: Socket): Promise<AccessTokenPayload> {
    const token = this.extractAccessToken(client);

    if (!token) {
      throw new WsException('Missing or invalid access token');
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.accessTokenService.verify(token);
    } catch {
      throw new WsException('Missing or invalid access token');
    }
    if (!payload.sub || !payload.sid) {
      throw new WsException('Missing or invalid access token');
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
      throw new WsException('Missing or invalid access token');
    }
    return payload;
  }

  private extractAccessToken(client: Socket): string | null {
    const handshakeAuth = client.handshake.auth as Record<string, unknown>;

    const authenticationToken = handshakeAuth.accessToken;

    if (typeof authenticationToken === 'string' && authenticationToken.trim()) {
      return authenticationToken.trim();
    }

    const authorization = client.handshake.headers.authorization;
    const parts = authorization?.trim().split(/\s+/) ?? [];

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}
