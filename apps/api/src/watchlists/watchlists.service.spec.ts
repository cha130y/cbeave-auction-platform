import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { AuctionStatus } from '../generated/prisma/enums';
import { WatchlistItemRecord } from './queries/watchlist-item.select';
import { WatchlistsService } from './watchlists.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SELLER_ID = '22222222-2222-4222-8222-222222222222';
const AUCTION_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_AUCTION_ID = '44444444-4444-4444-8444-444444444444';
const CATEGORY_ID = '55555555-5555-4555-8555-555555555555';

const WATCHED_AT = new Date('2026-03-01T09:00:00.000Z');
const STARTS_AT = new Date('2026-03-02T10:00:00.000Z');
const ENDS_AT = new Date('2026-03-02T12:00:00.000Z');
const PUBLISHED_AT = new Date('2026-03-01T08:00:00.000Z');

const PUBLIC_STATUSES = [
  AuctionStatus.SCHEDULED,
  AuctionStatus.ACTIVE,
  AuctionStatus.SOLD,
  AuctionStatus.UNSOLD,
];

describe('WatchlistsService', () => {
  let watchlistsService: WatchlistsService;

  const auctionFindFirstMock = jest.fn();
  const watchlistUpsertMock = jest.fn();
  const watchlistDeleteManyMock = jest.fn();
  // Typed so the paging assertions below are not reading through any.
  const watchlistFindManyMock = jest.fn() as jest.MockedFunction<
    (args: Record<string, unknown>) => Promise<unknown[]>
  >;

  const decimal = (value: string): Prisma.Decimal => new Prisma.Decimal(value);

  // Mirrors publicAuctionSummarySelect, including the reservePrice the mapper
  // reads to derive reserveMet but must never return.
  const createEntry = (
    overrides: {
      auctionId?: string;
      currentPrice?: string;
      reservePrice?: string | null;
      bidCount?: number;
    } = {},
  ): WatchlistItemRecord => ({
    auctionId: overrides.auctionId ?? AUCTION_ID,
    createdAt: WATCHED_AT,
    auction: {
      id: overrides.auctionId ?? AUCTION_ID,
      title: 'Vintage diving watch',
      status: AuctionStatus.ACTIVE,
      currency: 'THB',
      startingPrice: decimal('500.00'),
      currentPrice: decimal(overrides.currentPrice ?? '750.00'),
      reservePrice:
        overrides.reservePrice === null
          ? null
          : decimal(overrides.reservePrice ?? '700.00'),
      bidCount: overrides.bidCount ?? 3,
      scheduledStartAt: STARTS_AT,
      currentEndAt: ENDS_AT,
      publishedAt: PUBLISHED_AT,
      category: { id: CATEGORY_ID, name: 'Watches', slug: 'watches' },
      seller: {
        id: SELLER_ID,
        userProfile: { displayName: 'AuctionJohn', avatarUrl: null },
      },
      auctionImages: [{ url: 'https://cdn.test/watch.jpg', altText: null }],
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    auctionFindFirstMock.mockResolvedValue({ id: AUCTION_ID });
    watchlistUpsertMock.mockResolvedValue({
      auctionId: AUCTION_ID,
      createdAt: WATCHED_AT,
    });
    watchlistDeleteManyMock.mockResolvedValue({ count: 1 });
    watchlistFindManyMock.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchlistsService,
        {
          provide: PrismaService,
          useValue: {
            auction: { findFirst: auctionFindFirstMock },
            watchlist: {
              upsert: watchlistUpsertMock,
              deleteMany: watchlistDeleteManyMock,
              findMany: watchlistFindManyMock,
            },
          },
        },
      ],
    }).compile();

    watchlistsService = module.get(WatchlistsService);
  });

  describe('watchAuction', () => {
    it('rejects an auction that is not publicly visible', async () => {
      auctionFindFirstMock.mockResolvedValue(null);

      await expect(
        watchlistsService.watchAuction({
          userId: USER_ID,
          auctionId: AUCTION_ID,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(watchlistUpsertMock).not.toHaveBeenCalled();
    });

    it('looks only for published, non-deleted auctions', async () => {
      await watchlistsService.watchAuction({
        userId: USER_ID,
        auctionId: AUCTION_ID,
      });

      expect(auctionFindFirstMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: AUCTION_ID,
            status: { in: PUBLIC_STATUSES },
            deletedAt: null,
          },
        }),
      );
    });

    it('upserts on the user/auction pair so watching twice stays idempotent', async () => {
      const first = await watchlistsService.watchAuction({
        userId: USER_ID,
        auctionId: AUCTION_ID,
      });

      const second = await watchlistsService.watchAuction({
        userId: USER_ID,
        auctionId: AUCTION_ID,
      });

      expect(second).toEqual(first);
      expect(second).toEqual({
        auctionId: AUCTION_ID,
        watched: true,
        createdAt: WATCHED_AT,
      });

      // An empty update keeps the original createdAt on a repeat watch.
      expect(watchlistUpsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_auctionId: { userId: USER_ID, auctionId: AUCTION_ID },
          },
          update: {},
          create: { userId: USER_ID, auctionId: AUCTION_ID },
        }),
      );
    });
  });

  describe('unwatchAuction', () => {
    it('removes only the caller entry and succeeds when nothing matches', async () => {
      watchlistDeleteManyMock.mockResolvedValue({ count: 0 });

      await expect(
        watchlistsService.unwatchAuction({
          userId: USER_ID,
          auctionId: AUCTION_ID,
        }),
      ).resolves.toBeUndefined();

      expect(watchlistDeleteManyMock).toHaveBeenCalledWith({
        where: { userId: USER_ID, auctionId: AUCTION_ID },
      });
    });
  });

  describe('listWatchlist', () => {
    it('returns watched auctions without exposing the reserve price', async () => {
      watchlistFindManyMock.mockResolvedValue([createEntry()]);

      const result = await watchlistsService.listWatchlist({
        userId: USER_ID,
        limit: 12,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].watchedAt).toEqual(WATCHED_AT);
      expect(result.items[0].auction).toEqual(
        expect.objectContaining({
          id: AUCTION_ID,
          status: AuctionStatus.ACTIVE,
          currentPrice: '750.00',
          bidCount: 3,
          reserveMet: true,
        }),
      );
      expect(result.items[0].auction).not.toHaveProperty('reservePrice');
    });

    it('reports reserveMet as false while the price is below the reserve', async () => {
      watchlistFindManyMock.mockResolvedValue([
        createEntry({ currentPrice: '600.00', reservePrice: '700.00' }),
      ]);

      const result = await watchlistsService.listWatchlist({
        userId: USER_ID,
        limit: 12,
      });

      expect(result.items[0].auction.reserveMet).toBe(false);
      expect(result.items[0].auction).not.toHaveProperty('reservePrice');
    });

    it('restricts the query to the caller and publicly visible auctions', async () => {
      await watchlistsService.listWatchlist({ userId: USER_ID, limit: 12 });

      expect(watchlistFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: USER_ID,
            auction: {
              status: { in: PUBLIC_STATUSES },
              deletedAt: null,
            },
          },
        }),
      );
    });

    it('returns the next cursor when more entries remain', async () => {
      // The service over-fetches by one to detect the extra page.
      watchlistFindManyMock.mockResolvedValue([
        createEntry(),
        createEntry({ auctionId: OTHER_AUCTION_ID }),
      ]);

      const result = await watchlistsService.listWatchlist({
        userId: USER_ID,
        limit: 1,
      });

      expect(watchlistFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({ take: 2 }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBe(AUCTION_ID);
    });

    it('returns a null cursor on the final page', async () => {
      watchlistFindManyMock.mockResolvedValue([createEntry()]);

      const result = await watchlistsService.listWatchlist({
        userId: USER_ID,
        limit: 12,
      });

      expect(result.nextCursor).toBeNull();
    });

    it('skips the cursor entry when continuing a page', async () => {
      await watchlistsService.listWatchlist({
        userId: USER_ID,
        cursor: AUCTION_ID,
        limit: 12,
      });

      expect(watchlistFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: {
            userId_auctionId: { userId: USER_ID, auctionId: AUCTION_ID },
          },
          skip: 1,
        }),
      );
    });

    it('omits cursor paging on a first page', async () => {
      await watchlistsService.listWatchlist({ userId: USER_ID, limit: 12 });

      const args = watchlistFindManyMock.mock.calls[0][0];

      expect(args).not.toHaveProperty('cursor');
      expect(args).not.toHaveProperty('skip');
    });
  });
});
