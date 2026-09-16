import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import {
  AdminActionType,
  UserRole,
  UserStatus,
} from '../generated/prisma/enums';
import { AdminUserSummaryRecord } from './queries/admin-user-summary.select';
import { AdminUsersService } from './users.service';

// expect.objectContaining is typed as any, which the lint rules reject once it
// is nested inside an object literal rather than passed as a whole argument.
const containing = (shape: Record<string, unknown>): unknown =>
  expect.objectContaining(shape);

const NOW = new Date('2026-03-01T12:00:00.000Z');

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_USER_ID = '33333333-3333-4333-8333-333333333333';

describe('AdminUsersService', () => {
  let adminUsersService: AdminUsersService;

  type FindManyArgs = { where: Record<string, unknown> };

  const userFindManyMock = jest.fn() as jest.MockedFunction<
    (args: FindManyArgs) => Promise<unknown[]>
  >;

  const userFindFirstMock = jest.fn();
  const transactionUserFindUniqueMock = jest.fn();
  const transactionUserUpdateMock = jest.fn();
  const sessionUpdateManyMock = jest.fn();
  const adminActionCreateMock = jest.fn();

  const transactionMock = {
    user: {
      findUnique: transactionUserFindUniqueMock,
      update: transactionUserUpdateMock,
    },
    userSession: {
      updateMany: sessionUpdateManyMock,
    },
    adminAction: {
      create: adminActionCreateMock,
    },
  };

  type RunTransaction = <T>(
    callback: (transaction: typeof transactionMock) => Promise<T>,
  ) => Promise<T>;

  const runTransactionMock = jest.fn() as jest.MockedFunction<RunTransaction>;

  const createUser = (
    overrides: {
      id?: string;
      role?: UserRole;
      status?: UserStatus;
    } = {},
  ): AdminUserSummaryRecord => ({
    id: overrides.id ?? USER_ID,
    email: 'buyer@example.com',
    role: overrides.role ?? UserRole.USER,
    status: overrides.status ?? UserStatus.ACTIVE,
    emailVerifiedAt: NOW,
    lastLoginAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    userProfile: {
      firstName: 'Somchai',
      lastName: null,
      displayName: 'Somchai',
      avatarUrl: null,
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);

    userFindManyMock.mockResolvedValue([]);
    userFindFirstMock.mockResolvedValue({ id: USER_ID });
    transactionUserFindUniqueMock.mockResolvedValue(createUser());
    transactionUserUpdateMock.mockResolvedValue(
      createUser({ status: UserStatus.SUSPENDED }),
    );
    sessionUpdateManyMock.mockResolvedValue({ count: 2 });
    adminActionCreateMock.mockResolvedValue({});
    runTransactionMock.mockImplementation((callback) =>
      callback(transactionMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        {
          provide: PrismaService,
          useValue: {
            user: { findMany: userFindManyMock, findFirst: userFindFirstMock },
            $transaction: runTransactionMock,
          },
        },
      ],
    }).compile();

    adminUsersService = module.get(AdminUsersService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('listUsers', () => {
    it('lists normal accounts only, never administrators', async () => {
      await adminUsersService.listUsers({ limit: 20 });

      expect(userFindManyMock.mock.calls[0][0].where).toEqual({
        role: UserRole.USER,
      });
    });

    it('applies the requested status filter', async () => {
      await adminUsersService.listUsers({
        limit: 20,
        status: UserStatus.SUSPENDED,
      });

      expect(userFindManyMock.mock.calls[0][0].where).toEqual({
        role: UserRole.USER,
        status: UserStatus.SUSPENDED,
      });
    });

    it('rejects a cursor that is not a normal account', async () => {
      userFindFirstMock.mockResolvedValue(null);

      await expect(
        adminUsersService.listUsers({ limit: 20, cursor: USER_ID }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(userFindFirstMock).toHaveBeenCalledWith({
        where: { id: USER_ID, role: UserRole.USER },
        select: { id: true },
      });
      expect(userFindManyMock).not.toHaveBeenCalled();
    });

    it('returns the next cursor when more accounts remain', async () => {
      userFindManyMock.mockResolvedValue([
        createUser(),
        createUser({ id: OTHER_USER_ID }),
      ]);

      const result = await adminUsersService.listUsers({ limit: 1 });

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBe(USER_ID);
    });

    it('never returns the password hash', async () => {
      userFindManyMock.mockResolvedValue([createUser()]);

      const result = await adminUsersService.listUsers({ limit: 20 });

      expect(result.items[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('changeUserStatus', () => {
    it('refuses to change the acting administrator account', async () => {
      await expect(
        adminUsersService.changeUserStatus({
          adminUserId: ADMIN_ID,
          targetUserId: ADMIN_ID,
          targetStatus: UserStatus.SUSPENDED,
          note: 'Testing',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it('refuses a status outside suspension and reactivation', async () => {
      await expect(
        adminUsersService.changeUserStatus({
          adminUserId: ADMIN_ID,
          targetUserId: USER_ID,
          targetStatus: UserStatus.DEACTIVATED,
          note: 'Testing',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it('rejects an account that does not exist', async () => {
      transactionUserFindUniqueMock.mockResolvedValue(null);

      await expect(
        adminUsersService.changeUserStatus({
          adminUserId: ADMIN_ID,
          targetUserId: USER_ID,
          targetStatus: UserStatus.SUSPENDED,
          note: 'Testing',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to manage another administrator', async () => {
      transactionUserFindUniqueMock.mockResolvedValue(
        createUser({ role: UserRole.ADMIN }),
      );

      await expect(
        adminUsersService.changeUserStatus({
          adminUserId: ADMIN_ID,
          targetUserId: USER_ID,
          targetStatus: UserStatus.SUSPENDED,
          note: 'Testing',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(transactionUserUpdateMock).not.toHaveBeenCalled();
    });

    it('refuses to reach a deactivated account through suspension controls', async () => {
      transactionUserFindUniqueMock.mockResolvedValue(
        createUser({ status: UserStatus.DEACTIVATED }),
      );

      await expect(
        adminUsersService.changeUserStatus({
          adminUserId: ADMIN_ID,
          targetUserId: USER_ID,
          targetStatus: UserStatus.SUSPENDED,
          note: 'Testing',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('stays idempotent when the account already has that status', async () => {
      transactionUserFindUniqueMock.mockResolvedValue(
        createUser({ status: UserStatus.SUSPENDED }),
      );

      const result = await adminUsersService.changeUserStatus({
        adminUserId: ADMIN_ID,
        targetUserId: USER_ID,
        targetStatus: UserStatus.SUSPENDED,
        note: 'Testing',
      });

      expect(result.status).toBe(UserStatus.SUSPENDED);
      // A repeated suspension writes neither a status change nor a second audit row.
      expect(transactionUserUpdateMock).not.toHaveBeenCalled();
      expect(adminActionCreateMock).not.toHaveBeenCalled();
      expect(sessionUpdateManyMock).not.toHaveBeenCalled();
    });

    it('suspends the account, revokes live sessions, and audits the reason', async () => {
      await adminUsersService.changeUserStatus({
        adminUserId: ADMIN_ID,
        targetUserId: USER_ID,
        targetStatus: UserStatus.SUSPENDED,
        note: 'Prohibited listings',
      });

      expect(transactionUserUpdateMock).toHaveBeenCalledWith(
        containing({
          where: { id: USER_ID },
          data: { status: UserStatus.SUSPENDED },
        }),
      );
      expect(sessionUpdateManyMock).toHaveBeenCalledWith({
        where: { userId: USER_ID, revokedAt: null },
        data: { revokedAt: NOW },
      });
      expect(adminActionCreateMock).toHaveBeenCalledWith({
        data: {
          adminUserId: ADMIN_ID,
          targetUserId: USER_ID,
          actionType: AdminActionType.SUSPEND_USER,
          note: 'Suspended user "buyer@example.com": Prohibited listings',
        },
      });
    });

    it('reactivates without revoking sessions', async () => {
      transactionUserFindUniqueMock.mockResolvedValue(
        createUser({ status: UserStatus.SUSPENDED }),
      );
      transactionUserUpdateMock.mockResolvedValue(
        createUser({ status: UserStatus.ACTIVE }),
      );

      await adminUsersService.changeUserStatus({
        adminUserId: ADMIN_ID,
        targetUserId: USER_ID,
        targetStatus: UserStatus.ACTIVE,
        note: 'Appeal accepted',
      });

      expect(sessionUpdateManyMock).not.toHaveBeenCalled();
      expect(adminActionCreateMock).toHaveBeenCalledWith({
        data: containing({
          actionType: AdminActionType.REACTIVATE_USER,
          note: 'Reactivated user "buyer@example.com": Appeal accepted',
        }),
      });
    });
  });
});
