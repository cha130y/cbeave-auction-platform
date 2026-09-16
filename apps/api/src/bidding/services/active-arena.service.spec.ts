import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { AuctionStatus, UserRole } from '../../generated/prisma/enums';
import { ActiveArenaStateRecord } from '../queries/active-arena-state.select';
import { ActiveArenaService } from './active-arena.service';
import { AuctionParticipantsService } from './auction-participants.service';

// expect.objectContaining is typed as any, which the lint rules reject once it
// is nested inside an object literal rather than passed as a whole argument.
const containing = (shape: Record<string, unknown>): unknown =>
  expect.objectContaining(shape);

const NOW = new Date('2026-03-01T12:00:00.000Z');
const STARTED_AT = new Date('2026-03-01T11:00:00.000Z');
const ENDS_AT = new Date('2026-03-01T13:00:00.000Z');

const AUCTION_ID = '11111111-1111-4111-8111-111111111111';
const SELLER_ID = '22222222-2222-4222-8222-222222222222';
const LEADER_ID = '33333333-3333-4333-8333-333333333333';
const VIEWER_ID = '44444444-4444-4444-8444-444444444444';

describe('ActiveArenaService', () => {
  let activeArenaService: ActiveArenaService;

  const auctionFindFirstMock = jest.fn();
  const countJoinedMock = jest.fn();

  const decimal = (value: string): Prisma.Decimal => new Prisma.Decimal(value);

  const bid = (
    bidderId: string,
    amount: string,
    sequenceNo: number,
    displayName: string | null,
  ) => ({
    bidderId,
    amount: decimal(amount),
    sequenceNo,
    placedAt: STARTED_AT,
    bidder: { userProfile: displayName ? { displayName } : null },
  });

  const createArenaAuction = (
    overrides: {
      reservePrice?: string | null;
      currentPrice?: string;
      bids?: ReturnType<typeof bid>[];
      startedAt?: Date | null;
      currentEndAt?: Date | null;
    } = {},
  ): ActiveArenaStateRecord => ({
    id: AUCTION_ID,
    sellerId: SELLER_ID,
    title: 'Vintage diving watch',
    status: AuctionStatus.ACTIVE,
    currency: 'THB',
    currentPrice: decimal(overrides.currentPrice ?? '750.00'),
    minBidIncrement: decimal('50.00'),
    reservePrice:
      overrides.reservePrice === null
        ? null
        : decimal(overrides.reservePrice ?? '700.00'),
    bidCount: 2,
    startedAt:
      overrides.startedAt === undefined ? STARTED_AT : overrides.startedAt,
    currentEndAt:
      overrides.currentEndAt === undefined ? ENDS_AT : overrides.currentEndAt,
    extensionCount: 1,
    // Selected newest-first by sequenceNo.
    bids: overrides.bids ?? [
      bid(LEADER_ID, '750.00', 2, 'AuctionJohn'),
      bid(VIEWER_ID, '700.00', 1, 'Somchai'),
    ],
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);

    auctionFindFirstMock.mockResolvedValue(createArenaAuction());
    countJoinedMock.mockResolvedValue(12);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActiveArenaService,
        {
          provide: PrismaService,
          useValue: { auction: { findFirst: auctionFindFirstMock } },
        },
        {
          provide: AuctionParticipantsService,
          useValue: { countJoined: countJoinedMock },
        },
      ],
    }).compile();

    activeArenaService = module.get(ActiveArenaService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const getState = (overrides: { userId?: string; userRole?: UserRole } = {}) =>
    activeArenaService.getState({
      auctionId: AUCTION_ID,
      userId: overrides.userId ?? VIEWER_ID,
      userRole: overrides.userRole ?? UserRole.USER,
    });

  it('asks only for an active auction whose deadline has not passed', async () => {
    await getState();

    expect(auctionFindFirstMock).toHaveBeenCalledWith(
      containing({
        where: {
          id: AUCTION_ID,
          status: AuctionStatus.ACTIVE,
          deletedAt: null,
          currentEndAt: { gt: NOW },
        },
      }),
    );
  });

  it('refuses an auction that is not running', async () => {
    auctionFindFirstMock.mockResolvedValue(null);

    await expect(getState()).rejects.toBeInstanceOf(WsException);
  });

  it('refuses an auction missing its lifecycle timestamps', async () => {
    auctionFindFirstMock.mockResolvedValue(
      createArenaAuction({ startedAt: null }),
    );

    await expect(getState()).rejects.toBeInstanceOf(WsException);
  });

  it('derives the minimum next bid from the price and increment', async () => {
    const state = await getState();

    expect(state.currentPrice).toBe('750.00');
    expect(state.minimumNextBid).toBe('800.00');
  });

  it('masks the leader and never returns the reserve amount', async () => {
    const state = await getState();

    expect(state.leader).toEqual({
      bidderDisplayName: 'A***n',
      amount: '750.00',
    });
    expect(state.reserveMet).toBe(true);
    expect(state).not.toHaveProperty('reservePrice');
  });

  it('reports the reserve as unmet while the price is below it', async () => {
    auctionFindFirstMock.mockResolvedValue(
      createArenaAuction({ currentPrice: '600.00', reservePrice: '700.00' }),
    );

    const state = await getState();

    expect(state.reserveMet).toBe(false);
    expect(state).not.toHaveProperty('reservePrice');
  });

  it('returns no leader before the first bid', async () => {
    auctionFindFirstMock.mockResolvedValue(createArenaAuction({ bids: [] }));

    const state = await getState();

    expect(state.leader).toBeNull();
    expect(state.recentBids).toEqual([]);
    expect(state.isCurrentUserLeading).toBe(false);
  });

  it('tells the leading viewer that they are ahead', async () => {
    const state = await getState({ userId: LEADER_ID });

    expect(state.isCurrentUserLeading).toBe(true);
  });

  it('stops the seller from bidding on their own auction', async () => {
    const state = await getState({ userId: SELLER_ID });

    expect(state.canBid).toBe(false);
  });

  it('stops an administrator from bidding', async () => {
    const state = await getState({ userRole: UserRole.ADMIN });

    expect(state.canBid).toBe(false);
  });

  it('lets another normal account bid', async () => {
    const state = await getState();

    expect(state.canBid).toBe(true);
  });

  it('feeds recent bids oldest first with masked names', async () => {
    const state = await getState();

    expect(state.recentBids).toEqual([
      {
        sequenceNo: 1,
        amount: '700.00',
        placedAt: STARTED_AT,
        bidderDisplayName: 'S***i',
      },
      {
        sequenceNo: 2,
        amount: '750.00',
        placedAt: STARTED_AT,
        bidderDisplayName: 'A***n',
      },
    ]);
  });

  it('falls back to a masked default when a bidder has no display name', async () => {
    auctionFindFirstMock.mockResolvedValue(
      createArenaAuction({ bids: [bid(LEADER_ID, '750.00', 2, null)] }),
    );

    const state = await getState();

    expect(state.leader?.bidderDisplayName).toBe('B***r');
  });

  it('reports the live participant count and extension state', async () => {
    const state = await getState();

    expect(countJoinedMock).toHaveBeenCalledWith(AUCTION_ID);
    expect(state.participantCount).toBe(12);
    expect(state.extensionCount).toBe(1);
    expect(state.currentEndAt).toEqual(ENDS_AT);
  });
});
