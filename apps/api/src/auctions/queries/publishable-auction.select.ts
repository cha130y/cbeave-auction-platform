import { Prisma } from '../../generated/prisma/client';

// Everything publication has to check before it may move a draft: ownership,
// status, pricing, schedule, category state, and the primary image.
export const publishableAuctionSelect = {
  id: true,
  sellerId: true,
  title: true,
  description: true,
  status: true,
  startingPrice: true,
  reservePrice: true,
  minBidIncrement: true,
  scheduledStartAt: true,
  currentEndAt: true,
  rowVersion: true,
  category: {
    select: {
      isActive: true,
    },
  },
  _count: {
    select: {
      auctionImages: true,
    },
  },
  auctionImages: {
    where: {
      isPrimary: true,
    },
    select: {
      id: true,
    },
  },
} satisfies Prisma.AuctionSelect;

export type PublishableAuctionRecord = Prisma.AuctionGetPayload<{
  select: typeof publishableAuctionSelect;
}>;
