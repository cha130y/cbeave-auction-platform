import { Prisma } from '../../generated/prisma/client';

export const ACTIVE_ARENA_RECENT_BID_LIMIT = 10;

export const activeArenaStateSelect = {
  id: true,
  sellerId: true,
  title: true,
  status: true,
  currency: true,
  currentPrice: true,
  minBidIncrement: true,

  // Internal-only fields used to derive reserveMet.
  reservePrice: true,
  bidCount: true,

  startedAt: true,
  currentEndAt: true,
  extensionCount: true,

  bids: {
    orderBy: {
      sequenceNo: 'desc',
    },
    take: ACTIVE_ARENA_RECENT_BID_LIMIT,
    select: {
      amount: true,
      sequenceNo: true,
      placedAt: true,
      bidder: {
        select: {
          userProfile: {
            select: {
              displayName: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.AuctionSelect;

export type ActiveArenaStateRecord = Prisma.AuctionGetPayload<{
  select: typeof activeArenaStateSelect;
}>;
