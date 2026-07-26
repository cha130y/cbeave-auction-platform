import { Prisma } from '../../generated/prisma/client';

export const publicAuctionSummarySelect = {
  id: true,
  title: true,
  status: true,
  currency: true,
  startingPrice: true,
  currentPrice: true,

  // Selected internally only to derive reserveMet.
  // The mapper must never return reservePrice.
  reservePrice: true,

  bidCount: true,
  scheduledStartAt: true,
  currentEndAt: true,
  publishedAt: true,

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

  auctionImages: {
    where: {
      isPrimary: true,
    },
    take: 1,
    select: {
      url: true,
      altText: true,
    },
  },
} satisfies Prisma.AuctionSelect;

export type PublicAuctionSummaryRecord = Prisma.AuctionGetPayload<{
  select: typeof publicAuctionSummarySelect;
}>;
