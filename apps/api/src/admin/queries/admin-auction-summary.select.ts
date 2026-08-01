import { Prisma } from '../../generated/prisma/client';

export const adminAuctionSummarySelect = {
  id: true,
  title: true,
  status: true,
  currency: true,
  currentPrice: true,
  bidCount: true,
  scheduledStartAt: true,
  currentEndAt: true,
  publishedAt: true,
  endedAt: true,
  cancellationReason: true,
  createdAt: true,
  updatedAt: true,

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
      email: true,
      userProfile: {
        select: {
          displayName: true,
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

export type AdminAuctionSummaryRecord = Prisma.AuctionGetPayload<{
  select: typeof adminAuctionSummarySelect;
}>;
