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
} satisfies Prisma.AuctionSelect;

export type PlaceBidAuctionRecord = Prisma.AuctionGetPayload<{
  select: typeof placeBidAuctionSelect;
}>;
