import {
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { AuthProvider, UserStatus } from '../generated/prisma/enums';
import { PrismaClientKnownRequestError } from '../generated/prisma/internal/prismaNamespace';
import { CloudinaryService } from '../infrastructure/cloudinary/cloudinary.service';
import { UsersService } from './users.service';

// expect.objectContaining is typed as any, which the lint rules reject once it
// is nested inside an object literal rather than passed as a whole argument.
const containing = (shape: Record<string, unknown>): unknown =>
  expect.objectContaining(shape);

const NOW = new Date('2026-03-01T12:00:00.000Z');
const EARLIER = new Date('2026-01-05T08:00:00.000Z');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const PROVIDER_ACCOUNT_ID = 'google-oauth-subject-123';

const uniqueEmailViolation = (): PrismaClientKnownRequestError =>
  new PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['email'] },
  });

describe('UsersService', () => {
  let usersService: UsersService;

  const userCreateMock = jest.fn();
  // Typed so the select-shape assertions below are not reading through any.
  type SelectArgs = { select: Record<string, unknown> };
  const userUpdateMock = jest.fn() as jest.MockedFunction<
    (args: SelectArgs) => Promise<unknown>
  >;
  const userFindUniqueMock = jest.fn() as jest.MockedFunction<
    (args: SelectArgs) => Promise<unknown>
  >;

  const transactionUserFindUniqueMock = jest.fn();
  const transactionUserCreateMock = jest.fn();
  const transactionUserUpdateMock = jest.fn();
  const authAccountFindUniqueMock = jest.fn();

  const uploadUserAvatarMock = jest.fn();

  const transactionMock = {
    user: {
      findUnique: transactionUserFindUniqueMock,
      create: transactionUserCreateMock,
      update: transactionUserUpdateMock,
    },
    authAccount: {
      findUnique: authAccountFindUniqueMock,
    },
  };

  type RunTransaction = <T>(
    callback: (transaction: typeof transactionMock) => Promise<T>,
  ) => Promise<T>;

  const runTransactionMock = jest.fn() as jest.MockedFunction<RunTransaction>;

  const socialInput = (
    overrides: Partial<Parameters<UsersService['resolveSocialUser']>[0]> = {},
  ) => ({
    provider: AuthProvider.GOOGLE,
    providerAccountId: PROVIDER_ACCOUNT_ID,
    email: 'buyer@example.com',
    emailVerified: true,
    firstName: 'Somchai',
    lastName: null,
    displayName: 'Somchai',
    avatarUrl: null,
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);

    userCreateMock.mockResolvedValue({ id: USER_ID });
    userUpdateMock.mockResolvedValue({ id: USER_ID });
    userFindUniqueMock.mockResolvedValue(null);
    authAccountFindUniqueMock.mockResolvedValue(null);
    transactionUserFindUniqueMock.mockResolvedValue(null);
    transactionUserCreateMock.mockResolvedValue({ id: USER_ID });
    transactionUserUpdateMock.mockResolvedValue({ id: USER_ID });
    uploadUserAvatarMock.mockResolvedValue({
      url: 'https://cdn.test/avatar.jpg',
      storageKey: `cbeave/users/${USER_ID}/avatar`,
    });
    runTransactionMock.mockImplementation((callback) =>
      callback(transactionMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: userCreateMock,
              update: userUpdateMock,
              findUnique: userFindUniqueMock,
            },
            $transaction: runTransactionMock,
          },
        },
        {
          provide: CloudinaryService,
          useValue: { uploadUserAvatar: uploadUserAvatarMock },
        },
      ],
    }).compile();

    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createLocalUser', () => {
    it('creates the account together with its profile', async () => {
      await usersService.createLocalUser({
        email: 'buyer@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Somchai',
        displayName: 'Somchai',
      });

      expect(userCreateMock).toHaveBeenCalledWith({
        data: {
          email: 'buyer@example.com',
          passwordHash: 'hashed-password',
          userProfile: {
            create: {
              firstName: 'Somchai',
              lastName: undefined,
              displayName: 'Somchai',
            },
          },
        },
      });
    });

    it('translates a duplicate email into a conflict', async () => {
      userCreateMock.mockRejectedValue(uniqueEmailViolation());

      await expect(
        usersService.createLocalUser({
          email: 'buyer@example.com',
          passwordHash: 'hashed-password',
          firstName: 'Somchai',
          displayName: 'Somchai',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows an unrelated database failure', async () => {
      userCreateMock.mockRejectedValue(new Error('connection lost'));

      await expect(
        usersService.createLocalUser({
          email: 'buyer@example.com',
          passwordHash: 'hashed-password',
          firstName: 'Somchai',
          displayName: 'Somchai',
        }),
      ).rejects.toThrow('connection lost');
    });
  });

  describe('findCurrentUserById', () => {
    it('never selects the password hash', async () => {
      await usersService.findCurrentUserById(USER_ID);

      const args = userFindUniqueMock.mock.calls[0][0];

      expect(args.select).not.toHaveProperty('passwordHash');
      expect(args.select).toEqual(
        expect.objectContaining({ id: true, email: true, role: true }),
      );
    });
  });

  describe('updateCurrentUserProfile', () => {
    it('applies the supplied fields to the nested profile', async () => {
      await usersService.updateCurrentUserProfile(USER_ID, {
        displayName: 'AuctionJohn',
        bio: 'Collector',
      });

      expect(userUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: USER_ID },
          data: {
            userProfile: {
              update: { displayName: 'AuctionJohn', bio: 'Collector' },
            },
          },
        }),
      );
    });

    it('forwards the first name under the column name Prisma expects', async () => {
      await usersService.updateCurrentUserProfile(USER_ID, {
        firstName: 'Somchai',
      });

      expect(userUpdateMock).toHaveBeenCalledWith(
        containing({
          data: { userProfile: { update: { firstName: 'Somchai' } } },
        }),
      );
    });

    it('passes an explicit null through so an optional field can be cleared', async () => {
      await usersService.updateCurrentUserProfile(USER_ID, { phone: null });

      expect(userUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { userProfile: { update: { phone: null } } },
        }),
      );
    });

    it('returns the profile without the password hash', async () => {
      await usersService.updateCurrentUserProfile(USER_ID, {
        displayName: 'AuctionJohn',
      });

      const args = userUpdateMock.mock.calls[0][0];

      expect(args.select).not.toHaveProperty('passwordHash');
    });
  });

  describe('updateCurrentUserAvatar', () => {
    it('stores the uploaded avatar URL on the profile', async () => {
      await usersService.updateCurrentUserAvatar(
        USER_ID,
        Buffer.from('image-bytes'),
      );

      expect(uploadUserAvatarMock).toHaveBeenCalledWith(
        Buffer.from('image-bytes'),
        USER_ID,
      );
      expect(userUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: USER_ID },
          data: {
            userProfile: {
              update: { avatarUrl: 'https://cdn.test/avatar.jpg' },
            },
          },
        }),
      );
    });

    it('leaves the profile untouched when the upload fails', async () => {
      uploadUserAvatarMock.mockRejectedValue(new Error('cloudinary down'));

      await expect(
        usersService.updateCurrentUserAvatar(
          USER_ID,
          Buffer.from('image-bytes'),
        ),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);

      expect(userUpdateMock).not.toHaveBeenCalled();
    });
  });

  describe('resolveSocialUser', () => {
    it('reuses the account already linked to the provider identity', async () => {
      const linkedUser = {
        id: USER_ID,
        email: 'buyer@example.com',
        role: 'USER',
        status: UserStatus.ACTIVE,
        userProfile: null,
      };

      authAccountFindUniqueMock.mockResolvedValue({ user: linkedUser });

      await expect(usersService.resolveSocialUser(socialInput())).resolves.toBe(
        linkedUser,
      );

      expect(transactionUserCreateMock).not.toHaveBeenCalled();
      expect(transactionUserUpdateMock).not.toHaveBeenCalled();
    });

    it('blocks a linked account that is no longer active', async () => {
      authAccountFindUniqueMock.mockResolvedValue({
        user: {
          id: USER_ID,
          email: 'buyer@example.com',
          role: 'USER',
          status: UserStatus.SUSPENDED,
          userProfile: null,
        },
      });

      await expect(
        usersService.resolveSocialUser(socialInput()),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses to link an existing account on an unverified matching email', async () => {
      transactionUserFindUniqueMock.mockResolvedValue({
        id: USER_ID,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: EARLIER,
        authAccounts: [],
      });

      await expect(
        usersService.resolveSocialUser(socialInput({ emailVerified: false })),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(transactionUserUpdateMock).not.toHaveBeenCalled();
      expect(transactionUserCreateMock).not.toHaveBeenCalled();
    });

    it('blocks linking into a suspended account', async () => {
      transactionUserFindUniqueMock.mockResolvedValue({
        id: USER_ID,
        status: UserStatus.SUSPENDED,
        emailVerifiedAt: EARLIER,
        authAccounts: [],
      });

      await expect(
        usersService.resolveSocialUser(socialInput()),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses a second identity from a provider already linked', async () => {
      transactionUserFindUniqueMock.mockResolvedValue({
        id: USER_ID,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: EARLIER,
        authAccounts: [{ id: 'existing-link' }],
      });

      await expect(
        usersService.resolveSocialUser(socialInput()),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('links the provider to an active account on a verified email', async () => {
      transactionUserFindUniqueMock.mockResolvedValue({
        id: USER_ID,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: EARLIER,
        authAccounts: [],
      });

      await usersService.resolveSocialUser(socialInput());

      expect(transactionUserUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: USER_ID },
          data: {
            // An account verified earlier keeps its original timestamp.
            emailVerifiedAt: EARLIER,
            authAccounts: {
              create: {
                provider: AuthProvider.GOOGLE,
                providerAccountId: PROVIDER_ACCOUNT_ID,
              },
            },
          },
        }),
      );
    });

    it('stamps verification when linking an account that had none', async () => {
      transactionUserFindUniqueMock.mockResolvedValue({
        id: USER_ID,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: null,
        authAccounts: [],
      });

      await usersService.resolveSocialUser(socialInput());

      expect(transactionUserUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: containing({ emailVerifiedAt: NOW }),
        }),
      );
    });

    it('creates a new account with its profile and provider link', async () => {
      await usersService.resolveSocialUser(
        socialInput({
          provider: AuthProvider.FACEBOOK,
          lastName: 'Jaidee',
          displayName: 'SomchaiJ',
          avatarUrl: 'https://cdn.test/fb-avatar.jpg',
        }),
      );

      expect(transactionUserCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            email: 'buyer@example.com',
            emailVerifiedAt: NOW,
            authAccounts: {
              create: {
                provider: AuthProvider.FACEBOOK,
                providerAccountId: PROVIDER_ACCOUNT_ID,
              },
            },
            userProfile: {
              create: {
                firstName: 'Somchai',
                lastName: 'Jaidee',
                displayName: 'SomchaiJ',
                avatarUrl: 'https://cdn.test/fb-avatar.jpg',
              },
            },
          },
        }),
      );
    });

    it('leaves a new account unverified when the provider email is unverified', async () => {
      await usersService.resolveSocialUser(
        socialInput({ emailVerified: false }),
      );

      expect(transactionUserCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: containing({ emailVerifiedAt: null }),
        }),
      );
    });

    it('normalizes the provider email before matching', async () => {
      await usersService.resolveSocialUser(
        socialInput({ email: '  Buyer@Example.COM  ' }),
      );

      expect(transactionUserFindUniqueMock).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'buyer@example.com' } }),
      );
      expect(transactionUserCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: containing({ email: 'buyer@example.com' }),
        }),
      );
    });
  });
});
