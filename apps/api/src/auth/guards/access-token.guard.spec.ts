import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { UserRole, UserStatus } from '../../generated/prisma/enums';
import { AccessTokenService } from '../services/access-token.service';
import { AccessTokenPayload } from '../types/access-token-payload.type';
import { AuthenticatedRequest } from '../types/authenticated-request.type';
import { AccessTokenGuard } from './access-token.guard';

const NOW = new Date('2026-03-01T12:00:00.000Z');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_USER_ID = '33333333-3333-4333-8333-333333333333';

const INVALID_TOKEN_MESSAGE = 'Missing or invalid access token';

describe('AccessTokenGuard', () => {
  let guard: AccessTokenGuard;

  const verifyMock = jest.fn() as jest.MockedFunction<
    AccessTokenService['verify']
  >;

  const sessionFindUniqueMock = jest.fn();

  const payload: AccessTokenPayload = {
    sub: USER_ID,
    sid: SESSION_ID,
    role: UserRole.USER,
  };

  const createRequest = (authorization?: string): AuthenticatedRequest =>
    ({
      headers: authorization === undefined ? {} : { authorization },
    }) as unknown as AuthenticatedRequest;

  const createContext = (request: AuthenticatedRequest): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

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
        AccessTokenGuard,
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

    guard = module.get<AccessTokenGuard>(AccessTokenGuard);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('reading the Authorization header', () => {
    it('accepts a valid bearer token and attaches the payload to the request', async () => {
      const request = createRequest('Bearer valid-access-token');

      await expect(guard.canActivate(createContext(request))).resolves.toBe(
        true,
      );

      expect(verifyMock).toHaveBeenCalledWith('valid-access-token');
      expect(request.authUser).toEqual(payload);
    });

    it('tolerates extra whitespace around the scheme and the token', async () => {
      const request = createRequest('  Bearer   valid-access-token  ');

      await expect(guard.canActivate(createContext(request))).resolves.toBe(
        true,
      );

      expect(verifyMock).toHaveBeenCalledWith('valid-access-token');
    });

    it.each([
      ['a missing header', undefined],
      ['an empty header', ''],
      ['a bare token without a scheme', 'valid-access-token'],
      ['a scheme without a token', 'Bearer'],
      ['a non-bearer scheme', 'Basic valid-access-token'],
      ['a lowercase scheme', 'bearer valid-access-token'],
      ['more parts than expected', 'Bearer token extra'],
    ])('rejects %s', async (_case: string, authorization?: string) => {
      await expect(
        guard.canActivate(createContext(createRequest(authorization))),
      ).rejects.toThrow(new UnauthorizedException(INVALID_TOKEN_MESSAGE));

      expect(verifyMock).not.toHaveBeenCalled();
      expect(sessionFindUniqueMock).not.toHaveBeenCalled();
    });
  });

  describe('verifying the token', () => {
    it('rejects a token the signer refuses', async () => {
      verifyMock.mockRejectedValue(new Error('jwt expired'));

      await expect(
        guard.canActivate(createContext(createRequest('Bearer stale-token'))),
      ).rejects.toThrow(new UnauthorizedException(INVALID_TOKEN_MESSAGE));

      expect(sessionFindUniqueMock).not.toHaveBeenCalled();
    });

    it('rejects a payload without a subject', async () => {
      verifyMock.mockResolvedValue({ ...payload, sub: '' });

      await expect(
        guard.canActivate(createContext(createRequest('Bearer token'))),
      ).rejects.toThrow(new UnauthorizedException(INVALID_TOKEN_MESSAGE));
    });

    it('rejects a payload without a session id', async () => {
      verifyMock.mockResolvedValue({ ...payload, sid: '' });

      await expect(
        guard.canActivate(createContext(createRequest('Bearer token'))),
      ).rejects.toThrow(new UnauthorizedException(INVALID_TOKEN_MESSAGE));

      expect(sessionFindUniqueMock).not.toHaveBeenCalled();
    });
  });

  describe('checking the session behind the token', () => {
    it('looks the session up by the id carried in the token', async () => {
      await guard.canActivate(createContext(createRequest('Bearer token')));

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

    it('rejects a token whose session no longer exists', async () => {
      sessionFindUniqueMock.mockResolvedValue(null);

      await expect(
        guard.canActivate(createContext(createRequest('Bearer token'))),
      ).rejects.toThrow(new UnauthorizedException(INVALID_TOKEN_MESSAGE));
    });

    it('rejects a token whose session belongs to another user', async () => {
      sessionFindUniqueMock.mockResolvedValue(
        createSession({ userId: OTHER_USER_ID }),
      );

      await expect(
        guard.canActivate(createContext(createRequest('Bearer token'))),
      ).rejects.toThrow(new UnauthorizedException(INVALID_TOKEN_MESSAGE));
    });

    it('rejects a revoked session so logout ends access immediately', async () => {
      sessionFindUniqueMock.mockResolvedValue(
        createSession({ revokedAt: new Date(NOW.getTime() - 1000) }),
      );

      await expect(
        guard.canActivate(createContext(createRequest('Bearer token'))),
      ).rejects.toThrow(new UnauthorizedException(INVALID_TOKEN_MESSAGE));
    });

    it('rejects a session that expired exactly now', async () => {
      sessionFindUniqueMock.mockResolvedValue(
        createSession({ expiresAt: NOW }),
      );

      await expect(
        guard.canActivate(createContext(createRequest('Bearer token'))),
      ).rejects.toThrow(new UnauthorizedException(INVALID_TOKEN_MESSAGE));
    });

    it('accepts a session with a millisecond left', async () => {
      sessionFindUniqueMock.mockResolvedValue(
        createSession({ expiresAt: new Date(NOW.getTime() + 1) }),
      );

      await expect(
        guard.canActivate(createContext(createRequest('Bearer token'))),
      ).resolves.toBe(true);
    });

    it.each([[UserStatus.SUSPENDED], [UserStatus.DEACTIVATED]])(
      'rejects a %s account holding a valid token',
      async (status: UserStatus) => {
        sessionFindUniqueMock.mockResolvedValue(createSession({ status }));

        const request = createRequest('Bearer token');

        await expect(guard.canActivate(createContext(request))).rejects.toThrow(
          new UnauthorizedException(INVALID_TOKEN_MESSAGE),
        );

        expect(request.authUser).toBeUndefined();
      },
    );
  });
});
