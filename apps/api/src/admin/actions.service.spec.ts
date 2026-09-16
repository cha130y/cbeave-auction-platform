import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { AdminActionType, AuctionStatus } from '../generated/prisma/enums';
import { AdminActionsService } from './actions.service';
import { AdminActionSummaryRecord } from './queries/admin-action-summary.select';

const NOW = new Date('2026-03-01T12:00:00.000Z');

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const ACTION_ID = '22222222-2222-4222-8222-222222222222';
const OLDER_ACTION_ID = '33333333-3333-4333-8333-333333333333';
const TARGET_USER_ID = '44444444-4444-4444-8444-444444444444';
const AUCTION_ID = '55555555-5555-4555-8555-555555555555';
const CATEGORY_ID = '66666666-6666-4666-8666-666666666666';

describe('AdminActionsService', () => {
  let adminActionsService: AdminActionsService;

  type FindManyArgs = {
    where?: Record<string, unknown>;
    take: number;
    cursor?: { id: string };
    skip?: number;
  };

  const adminActionFindManyMock = jest.fn() as jest.MockedFunction<
    (args: FindManyArgs) => Promise<unknown[]>
  >;

  const adminActionFindFirstMock = jest.fn();

  const createAction = (
    overrides: Partial<{
      id: string;
      actionType: AdminActionType;
      targetUser: unknown;
      auction: unknown;
      category: unknown;
    }> = {},
  ): AdminActionSummaryRecord =>
    ({
      id: overrides.id ?? ACTION_ID,
      actionType: overrides.actionType ?? AdminActionType.SUSPEND_USER,
      note: 'Suspended user "buyer@example.com": Prohibited listings',
      createdAt: NOW,
      adminUser: {
        id: ADMIN_ID,
        email: 'admin@example.com',
        userProfile: { displayName: 'Platform admin' },
      },
      targetUser:
        overrides.targetUser === undefined
          ? {
              id: TARGET_USER_ID,
              email: 'buyer@example.com',
              userProfile: { displayName: 'Somchai' },
            }
          : overrides.targetUser,
      auction: overrides.auction ?? null,
      category: overrides.category ?? null,
    }) as unknown as AdminActionSummaryRecord;

  beforeEach(async () => {
    jest.clearAllMocks();

    adminActionFindManyMock.mockResolvedValue([]);
    adminActionFindFirstMock.mockResolvedValue({ id: ACTION_ID });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminActionsService,
        {
          provide: PrismaService,
          useValue: {
            adminAction: {
              findMany: adminActionFindManyMock,
              findFirst: adminActionFindFirstMock,
            },
          },
        },
      ],
    }).compile();

    adminActionsService = module.get(AdminActionsService);
  });

  it('lists every action type when no filter is supplied', async () => {
    await adminActionsService.listActions({ limit: 20 });

    expect(adminActionFindManyMock.mock.calls[0][0].where).toBeUndefined();
  });

  it('applies the requested action-type filter', async () => {
    await adminActionsService.listActions({
      limit: 20,
      actionType: AdminActionType.CANCEL_AUCTION,
    });

    expect(adminActionFindManyMock.mock.calls[0][0].where).toEqual({
      actionType: AdminActionType.CANCEL_AUCTION,
    });
  });

  it('validates the cursor against the same filter', async () => {
    await adminActionsService.listActions({
      limit: 20,
      cursor: ACTION_ID,
      actionType: AdminActionType.CANCEL_AUCTION,
    });

    expect(adminActionFindFirstMock).toHaveBeenCalledWith({
      where: { id: ACTION_ID, actionType: AdminActionType.CANCEL_AUCTION },
      select: { id: true },
    });
  });

  it('rejects a cursor that does not match the filter', async () => {
    adminActionFindFirstMock.mockResolvedValue(null);

    await expect(
      adminActionsService.listActions({ limit: 20, cursor: ACTION_ID }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(adminActionFindManyMock).not.toHaveBeenCalled();
  });

  it('skips the cursor entry when continuing a page', async () => {
    await adminActionsService.listActions({ limit: 20, cursor: ACTION_ID });

    const args = adminActionFindManyMock.mock.calls[0][0];

    expect(args.cursor).toEqual({ id: ACTION_ID });
    expect(args.skip).toBe(1);
  });

  it('returns the next cursor when more actions remain', async () => {
    adminActionFindManyMock.mockResolvedValue([
      createAction(),
      createAction({ id: OLDER_ACTION_ID }),
    ]);

    const result = await adminActionsService.listActions({ limit: 1 });

    expect(adminActionFindManyMock.mock.calls[0][0].take).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe(ACTION_ID);
  });

  it('returns the acting administrator and the typed user target', async () => {
    adminActionFindManyMock.mockResolvedValue([createAction()]);

    const result = await adminActionsService.listActions({ limit: 20 });

    expect(result.items[0].adminUser).toEqual({
      id: ADMIN_ID,
      email: 'admin@example.com',
      displayName: 'Platform admin',
    });
    expect(result.items[0].targetUser).toEqual({
      id: TARGET_USER_ID,
      email: 'buyer@example.com',
      displayName: 'Somchai',
    });
    expect(result.items[0].auction).toBeNull();
    expect(result.items[0].category).toBeNull();
  });

  it('returns an auction target for a lifecycle action', async () => {
    adminActionFindManyMock.mockResolvedValue([
      createAction({
        actionType: AdminActionType.CANCEL_AUCTION,
        targetUser: null,
        auction: {
          id: AUCTION_ID,
          title: 'Vintage diving watch',
          status: AuctionStatus.CANCELLED,
        },
      }),
    ]);

    const result = await adminActionsService.listActions({ limit: 20 });

    expect(result.items[0].targetUser).toBeNull();
    expect(result.items[0].auction).toEqual({
      id: AUCTION_ID,
      title: 'Vintage diving watch',
      status: AuctionStatus.CANCELLED,
    });
  });

  it('returns a category target for a taxonomy action', async () => {
    adminActionFindManyMock.mockResolvedValue([
      createAction({
        actionType: AdminActionType.DEACTIVATE_CATEGORY,
        targetUser: null,
        category: { id: CATEGORY_ID, name: 'Watches' },
      }),
    ]);

    const result = await adminActionsService.listActions({ limit: 20 });

    expect(result.items[0].category).toEqual({
      id: CATEGORY_ID,
      name: 'Watches',
    });
  });
});
