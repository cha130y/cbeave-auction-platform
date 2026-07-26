import { Prisma } from '../../generated/prisma/client';

export const publicAuctionDetailSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  currency: true,
  startingPrice: true,
  currentPrice: true,

  // Internal-only fields used to derive reserveMet.
  reservePrice: true,
  bidCount: true,

  minBidIncrement: true,
  scheduledStartAt: true,
  originalEndAt: true,
  currentEndAt: true,
  publishedAt: true,
  startedAt: true,
  endedAt: true,
  extensionCount: true,
  soldPrice: true,

  auctionImages: {
    orderBy: {
      position: 'asc',
    },
    select: {
      id: true,
      url: true,
      altText: true,
      position: true,
      isPrimary: true,
    },
  },

  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },

  seller: {
    select: {
      id: true,
      userProfile: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },

  winner: {
    select: {
      id: true,
      userProfile: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
} satisfies Prisma.AuctionSelect;

export type PublicAuctionDetailRecord = Prisma.AuctionGetPayload<{
  select: typeof publicAuctionDetailSelect;
}>;
