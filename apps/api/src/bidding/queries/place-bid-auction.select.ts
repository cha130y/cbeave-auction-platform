import { Prisma } from '../../generated/prisma/client';

export const placeBidAuctionSelect = {
  id: true,
  sellerId: true,
  status: true,
  currentPrice: true,
  minBidIncrement: true,
  reservePrice: true,
  bidCount: true,
  currentEndAt: true,
  extensionCount: true,
  rowVersion: true,
  title: true,
  currency: true,
  bids: {
    orderBy: {
      sequenceNo: 'desc',
    },
    take: 1,
    select: {
      bidderId: true,
    },
  },
} satisfies Prisma.AuctionSelect;

export type PlaceBidAuctionRecord = Prisma.AuctionGetPayload<{
  select: typeof placeBidAuctionSelect;
}>;
