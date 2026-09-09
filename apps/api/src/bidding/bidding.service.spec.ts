import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BiddingService } from './bidding.service';
import { AuctionBiddingGateway } from './gateways/auction-bidding.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AuctionEventType,
  AuctionStatus,
  Prisma,
} from '../generated/prisma/client';
import { PrismaClientKnownRequestError } from '../generated/prisma/internal/prismaNamespace';
import { PlaceBidAuctionRecord } from './queries/place-bid-auction.select';
import { PlaceBidInput } from './types/place-bid.input';

const NOW = new Date('2026-03-01T12:00:00.000Z');
const ONE_HOUR_MS = 60 * 60 * 1000;
const TWO_MINUTES_MS = 2 * 60 * 1000;

const AUCTION_ID = '11111111-1111-4111-8111-111111111111';
const SELLER_ID = '22222222-2222-4222-8222-222222222222';
const BIDDER_ID = '33333333-3333-4333-8333-333333333333';
const PREVIOUS_BIDDER_ID = '44444444-4444-4444-8444-444444444444';
const BID_ID = '55555555-5555-4555-8555-555555555555';

describe('BiddingService.placeBid', () => {
  let biddingService: BiddingService;

  const bidFindUniqueMock = jest.fn();
  const bidCreateMock = jest.fn();
  const auctionFindFirstMock = jest.fn();
  const auctionUpdateManyMock = jest.fn();
  const auctionEventCreateMock = jest.fn();
  const auctionExtensionCreateMock = jest.fn();

  const transactionMock = {
    bid: {
      findUnique: bidFindUniqueMock,
      create: bidCreateMock,
    },
    auction: {
      findFirst: auctionFindFirstMock,
      updateMany: auctionUpdateManyMock,
    },
    auctionEvent: {
      create: auctionEventCreateMock,
    },
    auctionExtension: {
      create: auctionExtensionCreateMock,
    },
  };

  type RunTransaction = (
    callback: (transaction: typeof transactionMock) => Promise<unknown>,
    options: { isolationLevel: Prisma.TransactionIsolationLevel },
  ) => Promise<unknown>;

  const runTransactionMock = jest.fn() as jest.MockedFunction<RunTransaction>;
  const broadcastAcceptedBidMock = jest.fn();
  const createOutbidNotificationMock = jest.fn();

  const decimal = (value: string): Prisma.Decimal => new Prisma.Decimal(value);

  const createAuction = (
    overrides: Partial<PlaceBidAuctionRecord> = {},
  ): PlaceBidAuctionRecord => ({
    id: AUCTION_ID,
    sellerId: SELLER_ID,
    status: AuctionStatus.ACTIVE,
    currentPrice: decimal('100.00'),
    minBidIncrement: decimal('10.00'),
    reservePrice: decimal('500.00'),
    bidCount: 3,
    currentEndAt: new Date(NOW.getTime() + ONE_HOUR_MS),
    extensionCount: 0,
    rowVersion: 7,
    title: 'Vintage diving watch',
    currency: 'THB',
    bids: [{ bidderId: PREVIOUS_BIDDER_ID }],
    ...overrides,
  });

  const placeBidInput = (
    overrides: Partial<PlaceBidInput> = {},
  ): PlaceBidInput => ({
    auctionId: AUCTION_ID,
    bidderId: BIDDER_ID,
    amount: '110.00',
    clientRequestId: 'client-request-1',
    ...overrides,
  });

  const arrangeAcceptedBid = (auction: PlaceBidAuctionRecord): void => {
    bidFindUniqueMock.mockResolvedValue(null);
    auctionFindFirstMock.mockResolvedValue(auction);
    auctionUpdateManyMock.mockResolvedValue({ count: 1 });
    auctionEventCreateMock.mockResolvedValue({});
    bidCreateMock.mockResolvedValue({
      id: BID_ID,
      auctionId: AUCTION_ID,
      clientRequestId: 'client-request-1',
      amount: decimal('110.00'),
      sequenceNo: auction.bidCount + 1,
      placedAt: NOW,
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);

    runTransactionMock.mockImplementation((callback) =>
      callback(transactionMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiddingService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: runTransactionMock,
          },
        },
        {
          provide: AuctionBiddingGateway,
          useValue: {
            broadcastAcceptedBid: broadcastAcceptedBidMock,
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createOutbidNotification: createOutbidNotificationMock,
          },
        },
      ],
    }).compile();

    biddingService = module.get<BiddingService>(BiddingService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('accepting a bid', () => {
    it('accepts a bid at exactly the minimum increment and returns the new auction state', async () => {
      const auction = createAuction();
      arrangeAcceptedBid(auction);

      const response = await biddingService.placeBid(placeBidInput());

      expect(response).toEqual({
        id: BID_ID,
        auctionId: AUCTION_ID,
        clientRequestId: 'client-request-1',
        amount: '110.00',
        sequenceNo: 4,
        placedAt: NOW,
        currentPrice: '110.00',
        bidCount: 4,
        reserveMet: false,
        currentEndAt: auction.currentEndAt,
        extension: null,
      });
    });

    it('runs the whole bid in one serializable transaction', async () => {
      arrangeAcceptedBid(createAuction());

      await biddingService.placeBid(placeBidInput());

      expect(runTransactionMock).toHaveBeenCalledTimes(1);
      expect(runTransactionMock).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    });

    it('guards the auction update with the row version it read', async () => {
      arrangeAcceptedBid(createAuction());

      await biddingService.placeBid(placeBidInput());

      expect(auctionUpdateManyMock).toHaveBeenCalledWith({
        where: {
          id: AUCTION_ID,
          status: AuctionStatus.ACTIVE,
          currentEndAt: { gt: NOW },
          deletedAt: null,
          rowVersion: 7,
        },
        data: {
          currentPrice: decimal('110.00'),
          bidCount: { increment: 1 },
          rowVersion: { increment: 1 },
        },
      });
    });

    it('persists the bid with the next sequence number and the idempotency key', async () => {
      arrangeAcceptedBid(createAuction());

      await biddingService.placeBid(placeBidInput());

      expect(bidCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            auctionId: AUCTION_ID,
            bidderId: BIDDER_ID,
            amount: decimal('110.00'),
            sequenceNo: 4,
            clientRequestId: 'client-request-1',
            placedAt: NOW,
          },
        }),
      );
    });

    it('records a BID_PLACED event for the bidder', async () => {
      arrangeAcceptedBid(createAuction());

      await biddingService.placeBid(placeBidInput());

      expect(auctionEventCreateMock).toHaveBeenCalledTimes(1);
      expect(auctionEventCreateMock).toHaveBeenCalledWith({
        data: {
          auctionId: AUCTION_ID,
          actorUserId: BIDDER_ID,
          bidId: BID_ID,
          eventType: AuctionEventType.BID_PLACED,
        },
      });
    });

    it('reports the reserve as met once the bid reaches it, without exposing the amount', async () => {
      const auction = createAuction({
        currentPrice: decimal('490.00'),
        reservePrice: decimal('500.00'),
      });

      arrangeAcceptedBid(auction);
      bidCreateMock.mockResolvedValue({
        id: BID_ID,
        auctionId: AUCTION_ID,
        clientRequestId: 'client-request-1',
        amount: decimal('500.00'),
        sequenceNo: 4,
        placedAt: NOW,
      });

      const response = await biddingService.placeBid(
        placeBidInput({ amount: '500.00' }),
      );

      expect(response.reserveMet).toBe(true);
      expect(JSON.stringify(response)).not.toContain('reservePrice');
    });

    it('broadcasts the accepted bid only after the transaction committed', async () => {
      arrangeAcceptedBid(createAuction());

      const response = await biddingService.placeBid(placeBidInput());

      expect(broadcastAcceptedBidMock).toHaveBeenCalledTimes(1);
      expect(broadcastAcceptedBidMock).toHaveBeenCalledWith({
        auctionId: AUCTION_ID,
        amount: '110.00',
        sequenceNo: 4,
        placedAt: NOW,
        currentPrice: '110.00',
        bidCount: 4,
        reserveMet: false,
        currentEndAt: response.currentEndAt,
        extension: null,
      });

      expect(
        broadcastAcceptedBidMock.mock.invocationCallOrder[0],
      ).toBeGreaterThan(bidCreateMock.mock.invocationCallOrder[0]);
    });
  });

  describe('idempotency', () => {
    it('rejects a replayed client request without touching the auction', async () => {
      bidFindUniqueMock.mockResolvedValue({ id: BID_ID });

      await expect(biddingService.placeBid(placeBidInput())).rejects.toThrow(
        new ConflictException('Bid request has already been processed'),
      );

      expect(auctionFindFirstMock).not.toHaveBeenCalled();
      expect(auctionUpdateManyMock).not.toHaveBeenCalled();
      expect(bidCreateMock).not.toHaveBeenCalled();
      expect(broadcastAcceptedBidMock).not.toHaveBeenCalled();
    });

    it('translates a unique constraint violation on the client request id', async () => {
      arrangeAcceptedBid(createAuction());
      bidCreateMock.mockRejectedValue(
        new PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.8.0',
        }),
      );

      await expect(biddingService.placeBid(placeBidInput())).rejects.toThrow(
        new ConflictException('Bid request has already been processed'),
      );

      expect(broadcastAcceptedBidMock).not.toHaveBeenCalled();
    });
  });

  describe('concurrency', () => {
    it('rejects the bid when another transaction changed the auction first', async () => {
      arrangeAcceptedBid(createAuction());
      auctionUpdateManyMock.mockResolvedValue({ count: 0 });

      await expect(biddingService.placeBid(placeBidInput())).rejects.toThrow(
        new ConflictException('Auction changed; reload and try again'),
      );

      expect(bidCreateMock).not.toHaveBeenCalled();
      expect(broadcastAcceptedBidMock).not.toHaveBeenCalled();
    });

    it('translates a serialization failure into a retryable conflict', async () => {
      runTransactionMock.mockRejectedValue(
        new PrismaClientKnownRequestError('Write conflict', {
          code: 'P2034',
          clientVersion: '7.8.0',
        }),
      );

      await expect(biddingService.placeBid(placeBidInput())).rejects.toThrow(
        new ConflictException('Auction changed; reload and try again'),
      );

      expect(broadcastAcceptedBidMock).not.toHaveBeenCalled();
    });
  });

  describe('rejecting a bid', () => {
    it('rejects a non-positive amount before opening a transaction', async () => {
      await expect(
        biddingService.placeBid(placeBidInput({ amount: '0.00' })),
      ).rejects.toThrow(
        new BadRequestException('Bid amount must be greater than zero'),
      );

      await expect(
        biddingService.placeBid(placeBidInput({ amount: '-5.00' })),
      ).rejects.toThrow(BadRequestException);

      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it('rejects a bid on a missing auction', async () => {
      bidFindUniqueMock.mockResolvedValue(null);
      auctionFindFirstMock.mockResolvedValue(null);

      await expect(biddingService.placeBid(placeBidInput())).rejects.toThrow(
        new NotFoundException('Auction not found'),
      );
    });

    it('rejects a bid on an auction that is not active', async () => {
      arrangeAcceptedBid(createAuction({ status: AuctionStatus.SCHEDULED }));

      await expect(biddingService.placeBid(placeBidInput())).rejects.toThrow(
        new ConflictException('Auction is not active'),
      );
    });

    it('rejects the seller bidding on their own auction', async () => {
      arrangeAcceptedBid(createAuction({ sellerId: BIDDER_ID }));

      await expect(biddingService.placeBid(placeBidInput())).rejects.toThrow(
        new ForbiddenException('The auction seller cannot bid on this auction'),
      );

      expect(auctionUpdateManyMock).not.toHaveBeenCalled();
    });

    it('rejects a bid once the auction end time has passed', async () => {
      arrangeAcceptedBid(createAuction({ currentEndAt: NOW }));

      await expect(biddingService.placeBid(placeBidInput())).rejects.toThrow(
        new ConflictException('Auction has ended'),
      );
    });

    it('rejects a bid on an auction with no end time', async () => {
      arrangeAcceptedBid(createAuction({ currentEndAt: null }));

      await expect(biddingService.placeBid(placeBidInput())).rejects.toThrow(
        new ConflictException('Auction has ended'),
      );
    });

    it('rejects a bid below the current price plus the minimum increment', async () => {
      arrangeAcceptedBid(createAuction());

      await expect(
        biddingService.placeBid(placeBidInput({ amount: '109.99' })),
      ).rejects.toThrow(
        new BadRequestException('Bid amount must be at least 110.00'),
      );

      expect(auctionUpdateManyMock).not.toHaveBeenCalled();
      expect(broadcastAcceptedBidMock).not.toHaveBeenCalled();
    });
  });

  describe('anti-sniping', () => {
    const arrangeExtension = (
      remainingMs: number,
      extensionCount: number,
    ): Date => {
      const currentEndAt = new Date(NOW.getTime() + remainingMs);

      arrangeAcceptedBid(createAuction({ currentEndAt, extensionCount }));

      auctionExtensionCreateMock.mockResolvedValue({
        extensionNumber: extensionCount + 1,
        previousEndAt: currentEndAt,
        newEndAt: new Date(currentEndAt.getTime() + TWO_MINUTES_MS),
      });

      return currentEndAt;
    };

    it('extends the auction by two minutes for a bid inside the final two minutes', async () => {
      const currentEndAt = arrangeExtension(30 * 1000, 2);
      const newEndAt = new Date(currentEndAt.getTime() + TWO_MINUTES_MS);

      const response = await biddingService.placeBid(placeBidInput());

      expect(auctionUpdateManyMock).toHaveBeenCalledWith({
        where: {
          id: AUCTION_ID,
          status: AuctionStatus.ACTIVE,
          currentEndAt: { gt: NOW },
          deletedAt: null,
          rowVersion: 7,
        },
        data: {
          currentPrice: decimal('110.00'),
          bidCount: { increment: 1 },
          rowVersion: { increment: 1 },
          currentEndAt: newEndAt,
          extensionCount: { increment: 1 },
        },
      });

      expect(auctionExtensionCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            auctionId: AUCTION_ID,
            triggeredByBidId: BID_ID,
            extensionNumber: 3,
            previousEndAt: currentEndAt,
            newEndAt,
          },
        }),
      );

      expect(response.currentEndAt).toEqual(newEndAt);
      expect(response.extension).toEqual({
        extensionNumber: 3,
        previousEndAt: currentEndAt,
        newEndAt,
      });
    });

    it('records an EXTENDED event after the BID_PLACED event', async () => {
      arrangeExtension(30 * 1000, 2);

      await biddingService.placeBid(placeBidInput());

      expect(auctionEventCreateMock).toHaveBeenCalledTimes(2);
      expect(auctionEventCreateMock).toHaveBeenNthCalledWith(1, {
        data: {
          auctionId: AUCTION_ID,
          actorUserId: BIDDER_ID,
          bidId: BID_ID,
          eventType: AuctionEventType.BID_PLACED,
        },
      });
      expect(auctionEventCreateMock).toHaveBeenNthCalledWith(2, {
        data: {
          auctionId: AUCTION_ID,
          actorUserId: BIDDER_ID,
          bidId: BID_ID,
          eventType: AuctionEventType.EXTENDED,
        },
      });
    });

    it('extends when exactly two minutes remain', async () => {
      arrangeExtension(TWO_MINUTES_MS, 0);

      const response = await biddingService.placeBid(placeBidInput());

      expect(response.extension).not.toBeNull();
    });

    it('does not extend a bid placed just outside the window', async () => {
      const currentEndAt = arrangeExtension(TWO_MINUTES_MS + 1, 0);

      const response = await biddingService.placeBid(placeBidInput());

      expect(auctionExtensionCreateMock).not.toHaveBeenCalled();
      expect(response.extension).toBeNull();
      expect(response.currentEndAt).toEqual(currentEndAt);
    });

    it('stops extending after five extensions but still accepts the bid', async () => {
      const currentEndAt = arrangeExtension(30 * 1000, 5);

      const response = await biddingService.placeBid(placeBidInput());

      expect(auctionExtensionCreateMock).not.toHaveBeenCalled();
      expect(auctionEventCreateMock).toHaveBeenCalledTimes(1);
      expect(response.extension).toBeNull();
      expect(response.currentEndAt).toEqual(currentEndAt);
      expect(response.sequenceNo).toBe(4);
    });

    it('still extends on the fifth extension', async () => {
      arrangeExtension(30 * 1000, 4);

      const response = await biddingService.placeBid(placeBidInput());

      expect(response.extension).toEqual(
        expect.objectContaining({ extensionNumber: 5 }),
      );
    });
  });

  describe('outbid notifications', () => {
    it('notifies the previous highest bidder inside the same transaction', async () => {
      arrangeAcceptedBid(createAuction());

      await biddingService.placeBid(placeBidInput());

      expect(createOutbidNotificationMock).toHaveBeenCalledTimes(1);
      expect(createOutbidNotificationMock).toHaveBeenCalledWith(
        transactionMock,
        {
          userId: PREVIOUS_BIDDER_ID,
          auctionId: AUCTION_ID,
          bidId: BID_ID,
          auctionTitle: 'Vintage diving watch',
          currentPrice: '110.00',
          currency: 'THB',
        },
      );
    });

    it('does not notify a bidder who is outbidding themselves', async () => {
      arrangeAcceptedBid(createAuction({ bids: [{ bidderId: BIDDER_ID }] }));

      await biddingService.placeBid(placeBidInput());

      expect(createOutbidNotificationMock).not.toHaveBeenCalled();
    });

    it('does not notify anyone on the first bid of an auction', async () => {
      arrangeAcceptedBid(createAuction({ bids: [], bidCount: 0 }));

      await biddingService.placeBid(placeBidInput());

      expect(createOutbidNotificationMock).not.toHaveBeenCalled();
    });
  });
});

describe('BiddingService.listPublicBidHistory', () => {
  let biddingService: BiddingService;

  const auctionFindFirstMock = jest.fn();
  const bidFindManyMock = jest.fn();

  const decimal = (value: string): Prisma.Decimal => new Prisma.Decimal(value);

  const createBidRecord = (sequenceNo: number, displayName: string | null) => ({
    sequenceNo,
    amount: decimal(`${100 + sequenceNo}.5`),
    placedAt: new Date(NOW.getTime() + sequenceNo * 1000),
    bidder: { userProfile: { displayName } },
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    auctionFindFirstMock.mockResolvedValue({ id: AUCTION_ID });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiddingService,
        {
          provide: PrismaService,
          useValue: {
            auction: { findFirst: auctionFindFirstMock },
            bid: { findMany: bidFindManyMock },
          },
        },
        {
          provide: AuctionBiddingGateway,
          useValue: { broadcastAcceptedBid: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { createOutbidNotification: jest.fn() },
        },
      ],
    }).compile();

    biddingService = module.get<BiddingService>(BiddingService);
  });

  it('only exposes the history of an auction the public can already see', async () => {
    auctionFindFirstMock.mockResolvedValue(null);

    await expect(
      biddingService.listPublicBidHistory({ auctionId: AUCTION_ID, limit: 20 }),
    ).rejects.toThrow(new NotFoundException('Auction not found'));

    expect(auctionFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: AUCTION_ID,
        status: {
          in: [
            AuctionStatus.SCHEDULED,
            AuctionStatus.ACTIVE,
            AuctionStatus.SOLD,
            AuctionStatus.UNSOLD,
          ],
        },
        deletedAt: null,
      },
      select: { id: true },
    });

    expect(bidFindManyMock).not.toHaveBeenCalled();
  });

  it('returns masked bidders and fixed decimal amounts in bid order', async () => {
    bidFindManyMock.mockResolvedValue([
      createBidRecord(1, 'AuctionJohn'),
      createBidRecord(2, null),
    ]);

    const response = await biddingService.listPublicBidHistory({
      auctionId: AUCTION_ID,
      limit: 20,
    });

    expect(response.items).toEqual([
      {
        sequenceNo: 1,
        amount: '101.50',
        placedAt: new Date(NOW.getTime() + 1000),
        bidderDisplayName: 'A***n',
      },
      {
        sequenceNo: 2,
        amount: '102.50',
        placedAt: new Date(NOW.getTime() + 2000),
        bidderDisplayName: 'B***r',
      },
    ]);

    expect(bidFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { auctionId: AUCTION_ID },
        orderBy: { sequenceNo: 'asc' },
        take: 21,
      }),
    );
  });

  it('asks for one row beyond the limit and reports the next cursor', async () => {
    bidFindManyMock.mockResolvedValue([
      createBidRecord(1, 'AuctionJohn'),
      createBidRecord(2, 'Somchai'),
      createBidRecord(3, 'Overflow'),
    ]);

    const response = await biddingService.listPublicBidHistory({
      auctionId: AUCTION_ID,
      limit: 2,
    });

    expect(response.items).toHaveLength(2);
    expect(response.nextCursor).toBe(2);
  });

  it('reports no next cursor when the page is not full', async () => {
    bidFindManyMock.mockResolvedValue([createBidRecord(1, 'AuctionJohn')]);

    const response = await biddingService.listPublicBidHistory({
      auctionId: AUCTION_ID,
      limit: 2,
    });

    expect(response.nextCursor).toBeNull();
  });

  it('continues after the cursor when one is supplied', async () => {
    bidFindManyMock.mockResolvedValue([]);

    await biddingService.listPublicBidHistory({
      auctionId: AUCTION_ID,
      cursor: 7,
      limit: 20,
    });

    expect(bidFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          auctionId: AUCTION_ID,
          sequenceNo: { gt: 7 },
        },
      }),
    );
  });
});
