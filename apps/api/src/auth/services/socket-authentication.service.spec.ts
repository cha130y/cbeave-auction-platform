import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { PrismaService } from '../../database/prisma.service';
import { UserRole, UserStatus } from '../../generated/prisma/enums';
import { AccessTokenPayload } from '../types/access-token-payload.type';
import { AccessTokenService } from './access-token.service';
import { SocketAuthenticationService } from './socket-authentication.service';

const NOW = new Date('2026-03-01T12:00:00.000Z');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_USER_ID = '33333333-3333-4333-8333-333333333333';

const INVALID_TOKEN_MESSAGE = 'Missing or invalid access token';

describe('SocketAuthenticationService', () => {
  let socketAuthenticationService: SocketAuthenticationService;

  const verifyMock = jest.fn() as jest.MockedFunction<
    AccessTokenService['verify']
  >;

  const sessionFindUniqueMock = jest.fn();

  const payload: AccessTokenPayload = {
    sub: USER_ID,
    sid: SESSION_ID,
    role: UserRole.USER,
  };

  const createClient = (handshake: {
    auth?: Record<string, unknown>;
    authorization?: string;
  }): Socket =>
    ({
      handshake: {
        auth: handshake.auth ?? {},
        headers:
          handshake.authorization === undefined
            ? {}
            : { authorization: handshake.authorization },
      },
    }) as unknown as Socket;

  const createSession = (
    overrides: {
      userId?: string;
      expiresAt?: Date;
      revokedAt?: Date | null;
      status?: UserStatus;
    } = {},
  ) => ({
    userId: overrides.userId ?? USER_ID,
    expiresAt: overrides.expiresAt ?? new Date(NOW.getTime() + 60_000),
    revokedAt: overrides.revokedAt ?? null,
    user: { status: overrides.status ?? UserStatus.ACTIVE },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);

    verifyMock.mockResolvedValue(payload);
    sessionFindUniqueMock.mockResolvedValue(createSession());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketAuthenticationService,
        {
          provide: AccessTokenService,
          useValue: { verify: verifyMock },
        },
        {
          provide: PrismaService,
          useValue: {
            userSession: { findUnique: sessionFindUniqueMock },
          },
        },
      ],
    }).compile();

    socketAuthenticationService = module.get<SocketAuthenticationService>(
      SocketAuthenticationService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('finding the token on the handshake', () => {
    it('prefers the access token supplied in the handshake auth payload', async () => {
      const client = createClient({
        auth: { accessToken: 'handshake-token' },
        authorization: 'Bearer header-token',
      });

      await expect(
        socketAuthenticationService.authenticate(client),
      ).resolves.toEqual(payload);

      expect(verifyMock).toHaveBeenCalledWith('handshake-token');
    });

    it('trims a padded handshake token', async () => {
      const client = createClient({
        auth: { accessToken: '  handshake-token  ' },
      });

      await socketAuthenticationService.authenticate(client);

      expect(verifyMock).toHaveBeenCalledWith('handshake-token');
    });

    it('falls back to the Authorization header when the handshake carries no token', async () => {
      const client = createClient({ authorization: 'Bearer header-token' });

      await socketAuthenticationService.authenticate(client);

      expect(verifyMock).toHaveBeenCalledWith('header-token');
    });

    it.each([
      ['a blank string', '   '],
      ['a number', 42],
      ['null', null],
    ])(
      'ignores a handshake token that is %s and uses the header instead',
      async (_case: string, accessToken: unknown) => {
        const client = createClient({
          auth: { accessToken },
          authorization: 'Bearer header-token',
        });

        await socketAuthenticationService.authenticate(client);

        expect(verifyMock).toHaveBeenCalledWith('header-token');
      },
    );

    it.each([
      ['no token at all', undefined],
      ['a bare token without a scheme', 'header-token'],
      ['a non-bearer scheme', 'Basic header-token'],
      ['a scheme without a token', 'Bearer'],
      ['more parts than expected', 'Bearer token extra'],
    ])('rejects a handshake with %s', async (_case, authorization?: string) => {
      const client = createClient({ authorization });

      await expect(
        socketAuthenticationService.authenticate(client),
      ).rejects.toThrow(new WsException(INVALID_TOKEN_MESSAGE));

      expect(verifyMock).not.toHaveBeenCalled();
      expect(sessionFindUniqueMock).not.toHaveBeenCalled();
    });
  });

  describe('rejecting with a websocket error rather than an HTTP one', () => {
    it('reports an unverifiable token as a WsException', async () => {
      verifyMock.mockRejectedValue(new Error('jwt malformed'));

      const client = createClient({ auth: { accessToken: 'broken-token' } });

      await expect(
        socketAuthenticationService.authenticate(client),
      ).rejects.toBeInstanceOf(WsException);
    });

    it('reports a rejected session as a WsException', async () => {
      sessionFindUniqueMock.mockResolvedValue(null);

      const client = createClient({ auth: { accessToken: 'valid-token' } });

      await expect(
        socketAuthenticationService.authenticate(client),
      ).rejects.toBeInstanceOf(WsException);
    });
  });

  describe('checking the session behind the token', () => {
    const authenticateWithValidToken = () =>
      socketAuthenticationService.authenticate(
        createClient({ auth: { accessToken: 'valid-token' } }),
      );

    it('rejects a payload missing its subject or session id', async () => {
      verifyMock.mockResolvedValue({ ...payload, sub: '' });

      await expect(authenticateWithValidToken()).rejects.toThrow(
        new WsException(INVALID_TOKEN_MESSAGE),
      );

      verifyMock.mockResolvedValue({ ...payload, sid: '' });

      await expect(authenticateWithValidToken()).rejects.toThrow(
        new WsException(INVALID_TOKEN_MESSAGE),
      );

      expect(sessionFindUniqueMock).not.toHaveBeenCalled();
    });

    it('rejects a session that belongs to another user', async () => {
      sessionFindUniqueMock.mockResolvedValue(
        createSession({ userId: OTHER_USER_ID }),
      );

      await expect(authenticateWithValidToken()).rejects.toThrow(
        new WsException(INVALID_TOKEN_MESSAGE),
      );
    });

    it('rejects a revoked session so a logged out socket cannot reconnect', async () => {
      sessionFindUniqueMock.mockResolvedValue(
        createSession({ revokedAt: new Date(NOW.getTime() - 1000) }),
      );

      await expect(authenticateWithValidToken()).rejects.toThrow(
        new WsException(INVALID_TOKEN_MESSAGE),
      );
    });

    it('rejects a session that expired exactly now', async () => {
      sessionFindUniqueMock.mockResolvedValue(
        createSession({ expiresAt: NOW }),
      );

      await expect(authenticateWithValidToken()).rejects.toThrow(
        new WsException(INVALID_TOKEN_MESSAGE),
      );
    });

    it.each([[UserStatus.SUSPENDED], [UserStatus.DEACTIVATED]])(
      'rejects a %s account holding a valid token',
      async (status: UserStatus) => {
        sessionFindUniqueMock.mockResolvedValue(createSession({ status }));

        await expect(authenticateWithValidToken()).rejects.toThrow(
          new WsException(INVALID_TOKEN_MESSAGE),
        );
      },
    );

    it('returns the payload for an active session', async () => {
      await expect(authenticateWithValidToken()).resolves.toEqual(payload);

      expect(sessionFindUniqueMock).toHaveBeenCalledWith({
        where: { id: SESSION_ID },
        select: {
          userId: true,
          expiresAt: true,
          revokedAt: true,
          user: { select: { status: true } },
        },
      });
    });
  });
});
