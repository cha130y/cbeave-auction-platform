import { Prisma } from '../../generated/prisma/client';

export const ownedAuctionSummarySelect = {
  id: true,
  title: true,
  status: true,
  currency: true,
  currentPrice: true,
  bidCount: true,
  scheduledStartAt: true,
  currentEndAt: true,
  createdAt: true,
  updatedAt: true,

  category: {
    select: {
      id: true,
      name: true,
      slug: true,
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

export type OwnedAuctionSummaryRecord = Prisma.AuctionGetPayload<{
  select: typeof ownedAuctionSummarySelect;
}>;
