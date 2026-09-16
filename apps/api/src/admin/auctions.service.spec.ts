import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import {
  AdminActionType,
  AuctionEventType,
  AuctionStatus,
  ParticipantStatus,
} from '../generated/prisma/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminAuctionsService } from './auctions.service';
import { AdminAuctionSummaryRecord } from './queries/admin-auction-summary.select';

// expect.objectContaining is typed as any, which the lint rules reject once it
// is nested inside an object literal rather than passed as a whole argument.
const containing = (shape: Record<string, unknown>): unknown =>
  expect.objectContaining(shape);

const NOW = new Date('2026-03-01T12:00:00.000Z');

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const SELLER_ID = '22222222-2222-4222-8222-222222222222';
const AUCTION_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_AUCTION_ID = '44444444-4444-4444-8444-444444444444';
const WATCHER_ID = '55555555-5555-4555-8555-555555555555';
const BIDDER_ID = '66666666-6666-4666-8666-666666666666';
const CATEGORY_ID = '77777777-7777-4777-8777-777777777777';

describe('AdminAuctionsService', () => {
  let adminAuctionsService: AdminAuctionsService;

  type FindManyArgs = { where: Record<string, unknown>; take: number };

  const auctionFindManyMock = jest.fn() as jest.MockedFunction<
    (args: FindManyArgs) => Promise<unknown[]>
  >;

  const auctionFindFirstMock = jest.fn();
  const transactionAuctionFindUniqueMock = jest.fn();
  const transactionAuctionFindUniqueOrThrowMock = jest.fn();
  const auctionUpdateManyMock = jest.fn();
  const auctionEventCreateMock = jest.fn();
  const adminActionCreateMock = jest.fn();
  const watchlistFindManyMock = jest.fn();
  const participantFindManyMock = jest.fn();
  const bidFindManyMock = jest.fn();

  const createCancellationNotificationsMock = jest.fn();

  const transactionMock = {
    auction: {
      findUnique: transactionAuctionFindUniqueMock,
      findUniqueOrThrow: transactionAuctionFindUniqueOrThrowMock,
      updateMany: auctionUpdateManyMock,
    },
    auctionEvent: { create: auctionEventCreateMock },
    adminAction: { create: adminActionCreateMock },
    watchlist: { findMany: watchlistFindManyMock },
    auctionParticipant: { findMany: participantFindManyMock },
    bid: { findMany: bidFindManyMock },
  };

  type RunTransaction = <T>(
    callback: (transaction: typeof transactionMock) => Promise<T>,
  ) => Promise<T>;

  const runTransactionMock = jest.fn() as jest.MockedFunction<RunTransaction>;

  const cancellableAuction = (
    overrides: { status?: AuctionStatus; rowVersion?: number } = {},
  ) => ({
    id: AUCTION_ID,
    sellerId: SELLER_ID,
    title: 'Vintage diving watch',
    status: overrides.status ?? AuctionStatus.SCHEDULED,
    cancellationReason: null,
    endedAt: null,
    rowVersion: overrides.rowVersion ?? 3,
  });

  const summaryRecord = (
    overrides: { id?: string } = {},
  ): AdminAuctionSummaryRecord => ({
    id: overrides.id ?? AUCTION_ID,
    title: 'Vintage diving watch',
    status: AuctionStatus.ACTIVE,
    currency: 'THB ',
    currentPrice: new Prisma.Decimal('750'),
    bidCount: 3,
    scheduledStartAt: NOW,
    currentEndAt: NOW,
    publishedAt: NOW,
    endedAt: null,
    cancellationReason: null,
    createdAt: NOW,
    updatedAt: NOW,
    category: { id: CATEGORY_ID, name: 'Watches', slug: 'watches' },
    seller: {
      id: SELLER_ID,
      email: 'seller@example.com',
      userProfile: { displayName: 'AuctionJohn' },
    },
    auctionImages: [{ url: 'https://cdn.test/watch.jpg', altText: null }],
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);

    auctionFindManyMock.mockResolvedValue([]);
    auctionFindFirstMock.mockResolvedValue({ id: AUCTION_ID });
    transactionAuctionFindUniqueMock.mockResolvedValue(cancellableAuction());
    transactionAuctionFindUniqueOrThrowMock.mockResolvedValue(
      cancellableAuction({ status: AuctionStatus.CANCELLED }),
    );
    auctionUpdateManyMock.mockResolvedValue({ count: 1 });
    auctionEventCreateMock.mockResolvedValue({});
    adminActionCreateMock.mockResolvedValue({});
    watchlistFindManyMock.mockResolvedValue([]);
    participantFindManyMock.mockResolvedValue([]);
    bidFindManyMock.mockResolvedValue([]);
    createCancellationNotificationsMock.mockResolvedValue(undefined);
    runTransactionMock.mockImplementation((callback) =>
      callback(transactionMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuctionsService,
        {
          provide: PrismaService,
          useValue: {
            auction: {
              findMany: auctionFindManyMock,
              findFirst: auctionFindFirstMock,
            },
            $transaction: runTransactionMock,
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createAuctionCancellationNotifications:
              createCancellationNotificationsMock,
          },
        },
      ],
    }).compile();

    adminAuctionsService = module.get(AdminAuctionsService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('listAuctions', () => {
    it('excludes soft-deleted auctions', async () => {
      await adminAuctionsService.listAuctions({ limit: 20 });

      expect(auctionFindManyMock.mock.calls[0][0].where).toEqual({
        deletedAt: null,
      });
    });

    it('applies the requested status filter', async () => {
      await adminAuctionsService.listAuctions({
        limit: 20,
        status: AuctionStatus.ACTIVE,
      });

      expect(auctionFindManyMock.mock.calls[0][0].where).toEqual({
        deletedAt: null,
        status: AuctionStatus.ACTIVE,
      });
    });

    it('validates the cursor against the same filter', async () => {
      await adminAuctionsService.listAuctions({
        limit: 20,
        cursor: AUCTION_ID,
        status: AuctionStatus.ACTIVE,
      });

      expect(auctionFindFirstMock).toHaveBeenCalledWith({
        where: {
          id: AUCTION_ID,
          deletedAt: null,
          status: AuctionStatus.ACTIVE,
        },
        select: { id: true },
      });
    });

    it('returns the next cursor when more auctions remain', async () => {
      auctionFindManyMock.mockResolvedValue([
        summaryRecord(),
        summaryRecord({ id: OTHER_AUCTION_ID }),
      ]);

      const result = await adminAuctionsService.listAuctions({ limit: 1 });

      expect(auctionFindManyMock.mock.calls[0][0].take).toBe(2);
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBe(AUCTION_ID);
    });

    it('serializes money at fixed precision and keeps the reserve private', async () => {
      auctionFindManyMock.mockResolvedValue([summaryRecord()]);

      const result = await adminAuctionsService.listAuctions({ limit: 20 });

      expect(result.items[0].currentPrice).toBe('750.00');
      expect(result.items[0].currency).toBe('THB');
      expect(result.items[0]).not.toHaveProperty('reservePrice');
    });
  });

  describe('cancelAuction', () => {
    const cancelInput = {
      adminUserId: ADMIN_ID,
      auctionId: AUCTION_ID,
      reason: 'Prohibited item',
    };

    it('rejects an auction that does not exist', async () => {
      transactionAuctionFindUniqueMock.mockResolvedValue(null);

      await expect(
        adminAuctionsService.cancelAuction(cancelInput),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('stays idempotent on an already cancelled auction', async () => {
      transactionAuctionFindUniqueMock.mockResolvedValue(
        cancellableAuction({ status: AuctionStatus.CANCELLED }),
      );

      const result = await adminAuctionsService.cancelAuction(cancelInput);

      expect(result.status).toBe(AuctionStatus.CANCELLED);
      // A repeated cancellation writes no second event, audit row, or notification.
      expect(auctionUpdateManyMock).not.toHaveBeenCalled();
      expect(auctionEventCreateMock).not.toHaveBeenCalled();
      expect(adminActionCreateMock).not.toHaveBeenCalled();
      expect(createCancellationNotificationsMock).not.toHaveBeenCalled();
    });

    it('refuses to cancel an auction that already ended', async () => {
      transactionAuctionFindUniqueMock.mockResolvedValue(
        cancellableAuction({ status: AuctionStatus.SOLD }),
      );

      await expect(
        adminAuctionsService.cancelAuction(cancelInput),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(auctionUpdateManyMock).not.toHaveBeenCalled();
    });

    it('refuses to cancel a private draft', async () => {
      transactionAuctionFindUniqueMock.mockResolvedValue(
        cancellableAuction({ status: AuctionStatus.DRAFT }),
      );

      await expect(
        adminAuctionsService.cancelAuction(cancelInput),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('fails when the auction changed since it was read', async () => {
      auctionUpdateManyMock.mockResolvedValue({ count: 0 });

      await expect(
        adminAuctionsService.cancelAuction(cancelInput),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(auctionEventCreateMock).not.toHaveBeenCalled();
      expect(createCancellationNotificationsMock).not.toHaveBeenCalled();
    });

    it('guards the write with the row version it read and clears the result fields', async () => {
      await adminAuctionsService.cancelAuction(cancelInput);

      expect(auctionUpdateManyMock).toHaveBeenCalledWith({
        where: {
          id: AUCTION_ID,
          status: {
            in: [AuctionStatus.SCHEDULED, AuctionStatus.ACTIVE],
          },
          rowVersion: 3,
          deletedAt: null,
        },
        data: {
          status: AuctionStatus.CANCELLED,
          cancellationReason: 'Prohibited item',
          endedAt: NOW,
          winnerUserId: null,
          winningBidId: null,
          soldPrice: null,
          rowVersion: { increment: 1 },
        },
      });
    });

    it('records the lifecycle event and the audit entry', async () => {
      await adminAuctionsService.cancelAuction(cancelInput);

      expect(auctionEventCreateMock).toHaveBeenCalledWith({
        data: {
          auctionId: AUCTION_ID,
          actorUserId: ADMIN_ID,
          eventType: AuctionEventType.CANCELLED,
        },
      });
      expect(adminActionCreateMock).toHaveBeenCalledWith({
        data: {
          adminUserId: ADMIN_ID,
          auctionId: AUCTION_ID,
          actionType: AdminActionType.CANCEL_AUCTION,
          note: 'Cancelled auction "Vintage diving watch": Prohibited item',
        },
      });
    });

    it('notifies the seller, watchers, participants, and bidders exactly once each', async () => {
      // The seller also watches and has bid, so the same account appears in
      // three of the four sources.
      watchlistFindManyMock.mockResolvedValue([
        { userId: WATCHER_ID },
        { userId: SELLER_ID },
      ]);
      participantFindManyMock.mockResolvedValue([{ userId: BIDDER_ID }]);
      bidFindManyMock.mockResolvedValue([
        { bidderId: BIDDER_ID },
        { bidderId: SELLER_ID },
      ]);

      await adminAuctionsService.cancelAuction(cancelInput);

      expect(participantFindManyMock).toHaveBeenCalledWith(
        containing({
          where: {
            auctionId: AUCTION_ID,
            status: ParticipantStatus.JOINED,
          },
        }),
      );

      const [, notificationInput] = createCancellationNotificationsMock.mock
        .calls[0] as [
        unknown,
        { userIds: string[]; auctionTitle: string; reason: string },
      ];

      expect(notificationInput.userIds).toEqual([
        SELLER_ID,
        WATCHER_ID,
        BIDDER_ID,
      ]);
      expect(notificationInput.reason).toBe('Prohibited item');
      expect(notificationInput.auctionTitle).toBe('Vintage diving watch');
    });

    it('returns the auction as it stands after the cancellation', async () => {
      const result = await adminAuctionsService.cancelAuction(cancelInput);

      expect(transactionAuctionFindUniqueOrThrowMock).toHaveBeenCalledWith(
        containing({ where: { id: AUCTION_ID } }),
      );
      expect(result.status).toBe(AuctionStatus.CANCELLED);
    });
  });
});
