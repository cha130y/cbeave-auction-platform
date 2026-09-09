import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { AuctionBiddingGateway } from '../../bidding/gateways/auction-bidding.gateway';
import { AuctionLifecycleService } from './auction-lifecycle.service';
import {
  AuctionEventType,
  AuctionStatus,
  Prisma,
} from '../../generated/prisma/client';

const NOW = new Date('2026-03-01T12:00:00.000Z');
const ONE_HOUR_MS = 60 * 60 * 1000;

const AUCTION_ID = '11111111-1111-4111-8111-111111111111';
const SELLER_ID = '22222222-2222-4222-8222-222222222222';
const WINNER_ID = '33333333-3333-4333-8333-333333333333';
const RUNNER_UP_ID = '44444444-4444-4444-8444-444444444444';
const WINNING_BID_ID = '55555555-5555-4555-8555-555555555555';
const RUNNER_UP_BID_ID = '66666666-6666-4666-8666-666666666666';

type ExpiredAuctionBid = {
  id: string;
  bidderId: string;
  amount: Prisma.Decimal;
  sequenceNo: number;
  bidder: { userProfile: { displayName: string | null } | null };
};

type ExpiredAuctionRow = {
  id: string;
  sellerId: string;
  title: string;
  currency: string;
  currentPrice: Prisma.Decimal;
  bidCount: number;
  rowVersion: number;
  reservePrice: Prisma.Decimal | null;
  bids: ExpiredAuctionBid[];
};

type ScheduledAuctionRow = {
  id: string;
  rowVersion: number;
  currentEndAt: Date | null;
};

describe('AuctionLifecycleService', () => {
  let lifecycleService: AuctionLifecycleService;

  const auctionUpdateManyMock = jest.fn();
  const auctionEventCreateMock = jest.fn();

  const transactionMock = {
    auction: {
      updateMany: auctionUpdateManyMock,
    },
    auctionEvent: {
      create: auctionEventCreateMock,
    },
  };

  type FindManyArgs = { where: { status: AuctionStatus } };

  const auctionFindManyMock = jest.fn() as jest.MockedFunction<
    (args: FindManyArgs) => Promise<unknown[]>
  >;

  type RunTransaction = (
    callback: (transaction: typeof transactionMock) => Promise<boolean>,
  ) => Promise<boolean>;

  const runTransactionMock = jest.fn() as jest.MockedFunction<RunTransaction>;

  const createAuctionResultNotificationsMock = jest.fn();
  const broadcastAuctionEndedMock = jest.fn();
  const broadcastAuctionStartedMock = jest.fn();

  const decimal = (value: string): Prisma.Decimal => new Prisma.Decimal(value);

  const winningBid: ExpiredAuctionBid = {
    id: WINNING_BID_ID,
    bidderId: WINNER_ID,
    amount: decimal('750.00'),
    sequenceNo: 3,
    bidder: { userProfile: { displayName: 'AuctionJohn' } },
  };

  const runnerUpBid: ExpiredAuctionBid = {
    id: RUNNER_UP_BID_ID,
    bidderId: RUNNER_UP_ID,
    amount: decimal('700.00'),
    sequenceNo: 2,
    bidder: { userProfile: { displayName: 'Somchai' } },
  };

  const createExpiredAuction = (
    overrides: Partial<ExpiredAuctionRow> = {},
  ): ExpiredAuctionRow => ({
    id: AUCTION_ID,
    sellerId: SELLER_ID,
    title: 'Vintage diving watch',
    currency: 'THB',
    currentPrice: decimal('750.00'),
    bidCount: 3,
    rowVersion: 4,
    reservePrice: decimal('500.00'),
    bids: [winningBid, runnerUpBid],
    ...overrides,
  });

  const createScheduledAuction = (
    overrides: Partial<ScheduledAuctionRow> = {},
  ): ScheduledAuctionRow => ({
    id: AUCTION_ID,
    rowVersion: 2,
    currentEndAt: new Date(NOW.getTime() + ONE_HOUR_MS),
    ...overrides,
  });

  const arrangeAuctions = (rows: {
    scheduled?: ScheduledAuctionRow[];
    expired?: ExpiredAuctionRow[];
  }): void => {
    auctionFindManyMock.mockImplementation((args) =>
      Promise.resolve(
        args.where.status === AuctionStatus.SCHEDULED
          ? (rows.scheduled ?? [])
          : (rows.expired ?? []),
      ),
    );
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);

    // the service logs its own summary and swallowed failures
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    auctionUpdateManyMock.mockResolvedValue({ count: 1 });
    auctionEventCreateMock.mockResolvedValue({});
    runTransactionMock.mockImplementation((callback) =>
      callback(transactionMock),
    );
    arrangeAuctions({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionLifecycleService,
        {
          provide: PrismaService,
          useValue: {
            auction: {
              findMany: auctionFindManyMock,
            },
            $transaction: runTransactionMock,
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createAuctionResultNotifications:
              createAuctionResultNotificationsMock,
          },
        },
        {
          provide: AuctionBiddingGateway,
          useValue: {
            broadcastAuctionEnded: broadcastAuctionEndedMock,
            broadcastAuctionStarted: broadcastAuctionStartedMock,
          },
        },
      ],
    }).compile();

    lifecycleService = module.get<AuctionLifecycleService>(
      AuctionLifecycleService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('completing expired auctions', () => {
    it('marks an auction SOLD when the highest bid reached the reserve price', async () => {
      arrangeAuctions({ expired: [createExpiredAuction()] });

      await lifecycleService.reconcileAuctionLifecycle();

      expect(auctionUpdateManyMock).toHaveBeenCalledWith({
        where: {
          id: AUCTION_ID,
          status: AuctionStatus.ACTIVE,
          currentEndAt: { lte: NOW },
          deletedAt: null,
          rowVersion: 4,
        },
        data: {
          status: AuctionStatus.SOLD,
          endedAt: NOW,
          winnerUserId: WINNER_ID,
          winningBidId: WINNING_BID_ID,
          soldPrice: decimal('750.00'),
          rowVersion: { increment: 1 },
        },
      });
    });

    it('marks an auction SOLD when it has bids but no reserve price', async () => {
      arrangeAuctions({
        expired: [createExpiredAuction({ reservePrice: null })],
      });

      await lifecycleService.reconcileAuctionLifecycle();

      expect(auctionUpdateManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: AuctionStatus.SOLD,
            endedAt: NOW,
            winnerUserId: WINNER_ID,
            winningBidId: WINNING_BID_ID,
            soldPrice: decimal('750.00'),
            rowVersion: { increment: 1 },
          },
        }) as unknown,
      );
    });

    it('treats a bid exactly at the reserve price as met', async () => {
      arrangeAuctions({
        expired: [
          createExpiredAuction({
            reservePrice: decimal('750.00'),
          }),
        ],
      });

      await lifecycleService.reconcileAuctionLifecycle();

      expect(broadcastAuctionEndedMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuctionStatus.SOLD,
          reserveMet: true,
        }) as unknown,
      );
    });

    it('marks an auction UNSOLD when the highest bid stayed below the reserve price', async () => {
      arrangeAuctions({
        expired: [
          createExpiredAuction({
            reservePrice: decimal('1000.00'),
          }),
        ],
      });

      await lifecycleService.reconcileAuctionLifecycle();

      expect(auctionUpdateManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: AuctionStatus.UNSOLD,
            endedAt: NOW,
            winnerUserId: null,
            winningBidId: null,
            soldPrice: null,
            rowVersion: { increment: 1 },
          },
        }) as unknown,
      );
    });

    it('marks an auction with no bids UNSOLD and records an event without a bid', async () => {
      arrangeAuctions({
        expired: [createExpiredAuction({ bids: [], bidCount: 0 })],
      });

      await lifecycleService.reconcileAuctionLifecycle();

      expect(auctionEventCreateMock).toHaveBeenCalledWith({
        data: {
          auctionId: AUCTION_ID,
          bidId: null,
          eventType: AuctionEventType.ENDED,
        },
      });

      expect(createAuctionResultNotificationsMock).toHaveBeenCalledWith(
        transactionMock,
        expect.objectContaining({
          result: { sold: false, highestBidId: null },
        }) as unknown,
      );
    });

    it('records the ENDED event and the sold result inside the same transaction', async () => {
      arrangeAuctions({ expired: [createExpiredAuction()] });

      await lifecycleService.reconcileAuctionLifecycle();

      expect(auctionEventCreateMock).toHaveBeenCalledWith({
        data: {
          auctionId: AUCTION_ID,
          bidId: WINNING_BID_ID,
          eventType: AuctionEventType.ENDED,
        },
      });

      expect(createAuctionResultNotificationsMock).toHaveBeenCalledWith(
        transactionMock,
        {
          auctionId: AUCTION_ID,
          auctionTitle: 'Vintage diving watch',
          sellerId: SELLER_ID,
          currency: 'THB',
          result: {
            sold: true,
            winnerUserId: WINNER_ID,
            winningBidId: WINNING_BID_ID,
            soldPrice: '750.00',
          },
        },
      );
    });

    it('broadcasts the result with a masked winner and a podium', async () => {
      arrangeAuctions({ expired: [createExpiredAuction()] });

      await lifecycleService.reconcileAuctionLifecycle();

      expect(broadcastAuctionEndedMock).toHaveBeenCalledWith({
        auctionId: AUCTION_ID,
        status: AuctionStatus.SOLD,
        currency: 'THB',
        finalPrice: '750.00',
        bidCount: 3,
        reserveMet: true,
        endedAt: NOW,
        winnerDisplayName: 'A***n',
        podiumBids: [
          {
            sequenceNo: 3,
            amount: '750.00',
            bidderDisplayName: 'A***n',
          },
          {
            sequenceNo: 2,
            amount: '700.00',
            bidderDisplayName: 'S***i',
          },
        ],
      });
    });

    it('hides the winner and the podium for an unsold auction', async () => {
      arrangeAuctions({
        expired: [createExpiredAuction({ reservePrice: decimal('1000.00') })],
      });

      await lifecycleService.reconcileAuctionLifecycle();

      expect(broadcastAuctionEndedMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuctionStatus.UNSOLD,
          reserveMet: false,
          winnerDisplayName: null,
          podiumBids: [],
        }) as unknown,
      );
    });

    it('skips the event, the notification and the broadcast when another writer won the race', async () => {
      arrangeAuctions({ expired: [createExpiredAuction()] });
      auctionUpdateManyMock.mockResolvedValue({ count: 0 });

      await lifecycleService.reconcileAuctionLifecycle();

      expect(auctionEventCreateMock).not.toHaveBeenCalled();
      expect(createAuctionResultNotificationsMock).not.toHaveBeenCalled();
      expect(broadcastAuctionEndedMock).not.toHaveBeenCalled();
    });
  });

  describe('activating due auctions', () => {
    it('activates a scheduled auction guarded by its row version', async () => {
      arrangeAuctions({ scheduled: [createScheduledAuction()] });

      await lifecycleService.reconcileAuctionLifecycle();

      expect(auctionUpdateManyMock).toHaveBeenCalledWith({
        where: {
          id: AUCTION_ID,
          status: AuctionStatus.SCHEDULED,
          scheduledStartAt: { lte: NOW },
          currentEndAt: { not: null },
          deletedAt: null,
          rowVersion: 2,
        },
        data: {
          status: AuctionStatus.ACTIVE,
          startedAt: NOW,
          rowVersion: { increment: 1 },
        },
      });

      expect(auctionEventCreateMock).toHaveBeenCalledWith({
        data: {
          auctionId: AUCTION_ID,
          eventType: AuctionEventType.STARTED,
        },
      });
    });

    it('broadcasts the start with ISO timestamps', async () => {
      const scheduled = createScheduledAuction();
      arrangeAuctions({ scheduled: [scheduled] });

      await lifecycleService.reconcileAuctionLifecycle();

      expect(broadcastAuctionStartedMock).toHaveBeenCalledWith({
        auctionId: AUCTION_ID,
        status: AuctionStatus.ACTIVE,
        startedAt: NOW.toISOString(),
        currentEndAt: scheduled.currentEndAt?.toISOString(),
      });
    });

    it('does not broadcast a start when another writer activated it first', async () => {
      arrangeAuctions({ scheduled: [createScheduledAuction()] });
      auctionUpdateManyMock.mockResolvedValue({ count: 0 });

      await lifecycleService.reconcileAuctionLifecycle();

      expect(auctionEventCreateMock).not.toHaveBeenCalled();
      expect(broadcastAuctionStartedMock).not.toHaveBeenCalled();
    });
  });

  describe('reconciliation run', () => {
    it('activates due auctions before completing expired ones', async () => {
      arrangeAuctions({
        scheduled: [createScheduledAuction()],
        expired: [createExpiredAuction()],
      });

      await lifecycleService.reconcileAuctionLifecycle();

      expect(
        broadcastAuctionStartedMock.mock.invocationCallOrder[0],
      ).toBeLessThan(broadcastAuctionEndedMock.mock.invocationCallOrder[0]);
    });

    it('skips a run while the previous one is still in flight', async () => {
      let releaseFirstRun: () => void = () => undefined;

      const firstRunGate = new Promise<void>((resolve) => {
        releaseFirstRun = resolve;
      });

      auctionFindManyMock.mockImplementationOnce(async () => {
        await firstRunGate;

        return [];
      });

      const firstRun = lifecycleService.reconcileAuctionLifecycle();

      await lifecycleService.reconcileAuctionLifecycle();

      expect(auctionFindManyMock).toHaveBeenCalledTimes(1);

      releaseFirstRun();
      await firstRun;
    });

    it('swallows a failing run and stays available for the next one', async () => {
      auctionFindManyMock.mockRejectedValueOnce(new Error('database is down'));

      await expect(
        lifecycleService.reconcileAuctionLifecycle(),
      ).resolves.toBeUndefined();

      arrangeAuctions({ scheduled: [createScheduledAuction()] });

      await lifecycleService.reconcileAuctionLifecycle();

      expect(broadcastAuctionStartedMock).toHaveBeenCalledTimes(1);
    });
  });
});
