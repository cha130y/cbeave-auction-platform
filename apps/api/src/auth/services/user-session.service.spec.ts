import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { UserRole, UserStatus } from '../../generated/prisma/enums';
import { RefreshTokenService } from './refresh-token.service';
import { UserSessionService } from './user-session.service';

const NOW = new Date('2026-03-01T12:00:00.000Z');
const TTL_DAYS = 7;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';

const CURRENT_TOKEN = 'current-refresh-token';
const CURRENT_TOKEN_HASH = 'e3b0c442-hash-of-the-current-token';
const NEXT_TOKEN = 'next-refresh-token';
const NEXT_TOKEN_HASH = '9f86d081-hash-of-the-next-token';

describe('UserSessionService', () => {
  let userSessionService: UserSessionService;

  const sessionCreateMock = jest.fn();
  const sessionFindUniqueMock = jest.fn();
  const sessionUpdateManyMock = jest.fn();

  const generateMock = jest.fn() as jest.MockedFunction<
    RefreshTokenService['generate']
  >;

  const hashMock = jest.fn() as jest.MockedFunction<
    RefreshTokenService['hash']
  >;

  const configGetMock = jest.fn() as jest.MockedFunction<() => number>;

  const expectedExpiresAt = new Date(NOW.getTime() + TTL_MS);

  const createSession = (
    overrides: {
      expiresAt?: Date;
      revokedAt?: Date | null;
      status?: UserStatus;
      role?: UserRole;
    } = {},
  ) => ({
    id: SESSION_ID,
    userId: USER_ID,
    expiresAt: overrides.expiresAt ?? new Date(NOW.getTime() + 60_000),
    revokedAt: overrides.revokedAt ?? null,
    user: {
      role: overrides.role ?? UserRole.USER,
      status: overrides.status ?? UserStatus.ACTIVE,
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);

    configGetMock.mockReturnValue(TTL_DAYS);
    generateMock.mockReturnValue(NEXT_TOKEN);
    hashMock.mockImplementation((token: string) =>
      token === CURRENT_TOKEN ? CURRENT_TOKEN_HASH : NEXT_TOKEN_HASH,
    );
    sessionCreateMock.mockResolvedValue({ id: SESSION_ID });
    sessionFindUniqueMock.mockResolvedValue(createSession());
    sessionUpdateManyMock.mockResolvedValue({ count: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSessionService,
        {
          provide: PrismaService,
          useValue: {
            userSession: {
              create: sessionCreateMock,
              findUnique: sessionFindUniqueMock,
              updateMany: sessionUpdateManyMock,
            },
          },
        },
        {
          provide: ConfigService,
          useValue: { get: configGetMock },
        },
        {
          provide: RefreshTokenService,
          useValue: { generate: generateMock, hash: hashMock },
        },
      ],
    }).compile();

    userSessionService = module.get<UserSessionService>(UserSessionService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create', () => {
    it('stores only the hash of the refresh token and returns the raw one', async () => {
      const result = await userSessionService.create(USER_ID);

      expect(sessionCreateMock).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          refreshTokenHash: NEXT_TOKEN_HASH,
          expiresAt: expectedExpiresAt,
        },
        select: { id: true },
      });

      expect(JSON.stringify(sessionCreateMock.mock.calls[0])).not.toContain(
        NEXT_TOKEN,
      );

      expect(result).toEqual({
        sessionId: SESSION_ID,
        refreshToken: NEXT_TOKEN,
        expiresAt: expectedExpiresAt,
      });
    });

    it('derives the expiry from the configured refresh token lifetime', async () => {
      configGetMock.mockReturnValue(30);

      const result = await userSessionService.create(USER_ID);

      expect(result.expiresAt).toEqual(
        new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000),
      );
    });
  });

  describe('rotate', () => {
    it('looks the session up by the hash of the presented token', async () => {
      await userSessionService.rotate(CURRENT_TOKEN);

      expect(sessionFindUniqueMock).toHaveBeenCalledWith({
        where: { refreshTokenHash: CURRENT_TOKEN_HASH },
        select: {
          id: true,
          userId: true,
          expiresAt: true,
          revokedAt: true,
          user: { select: { role: true, status: true } },
        },
      });
    });

    it('issues a fresh token and pushes the expiry out', async () => {
      const result = await userSessionService.rotate(CURRENT_TOKEN);

      expect(sessionUpdateManyMock).toHaveBeenCalledWith({
        where: {
          id: SESSION_ID,
          refreshTokenHash: CURRENT_TOKEN_HASH,
          revokedAt: null,
          expiresAt: { gt: NOW },
        },
        data: {
          refreshTokenHash: NEXT_TOKEN_HASH,
          expiresAt: expectedExpiresAt,
        },
      });

      expect(result).toEqual({
        sessionId: SESSION_ID,
        userId: USER_ID,
        userRole: UserRole.USER,
        refreshToken: NEXT_TOKEN,
        expiresAt: expectedExpiresAt,
      });
    });

    it('carries the current role of the account into the new session state', async () => {
      sessionFindUniqueMock.mockResolvedValue(
        createSession({ role: UserRole.ADMIN }),
      );

      const result = await userSessionService.rotate(CURRENT_TOKEN);

      expect(result?.userRole).toBe(UserRole.ADMIN);
    });

    it('refuses a token that matches no session', async () => {
      sessionFindUniqueMock.mockResolvedValue(null);

      await expect(
        userSessionService.rotate(CURRENT_TOKEN),
      ).resolves.toBeNull();

      expect(sessionUpdateManyMock).not.toHaveBeenCalled();
    });

    it('refuses a revoked session', async () => {
      sessionFindUniqueMock.mockResolvedValue(
        createSession({ revokedAt: new Date(NOW.getTime() - 1000) }),
      );

      await expect(
        userSessionService.rotate(CURRENT_TOKEN),
      ).resolves.toBeNull();

      expect(sessionUpdateManyMock).not.toHaveBeenCalled();
    });

    it('refuses a session that expired exactly now', async () => {
      sessionFindUniqueMock.mockResolvedValue(
        createSession({ expiresAt: NOW }),
      );

      await expect(
        userSessionService.rotate(CURRENT_TOKEN),
      ).resolves.toBeNull();
    });

    it.each([[UserStatus.SUSPENDED], [UserStatus.DEACTIVATED]])(
      'refuses to refresh a %s account',
      async (status: UserStatus) => {
        sessionFindUniqueMock.mockResolvedValue(createSession({ status }));

        await expect(
          userSessionService.rotate(CURRENT_TOKEN),
        ).resolves.toBeNull();

        expect(sessionUpdateManyMock).not.toHaveBeenCalled();
      },
    );

    it('refuses a replayed token when a concurrent refresh already rotated it', async () => {
      sessionUpdateManyMock.mockResolvedValue({ count: 0 });

      await expect(
        userSessionService.rotate(CURRENT_TOKEN),
      ).resolves.toBeNull();

      expect(generateMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('revokeByRefreshToken', () => {
    it('revokes the session matching the presented token', async () => {
      await userSessionService.revokeByRefreshToken(CURRENT_TOKEN);

      expect(sessionUpdateManyMock).toHaveBeenCalledWith({
        where: {
          refreshTokenHash: CURRENT_TOKEN_HASH,
          revokedAt: null,
        },
        data: { revokedAt: NOW },
      });
    });

    it('leaves an already revoked session untouched', async () => {
      sessionUpdateManyMock.mockResolvedValue({ count: 0 });

      await expect(
        userSessionService.revokeByRefreshToken(CURRENT_TOKEN),
      ).resolves.toBeUndefined();
    });
  });
});
