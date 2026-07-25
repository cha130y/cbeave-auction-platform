import { Prisma } from '../../generated/prisma/client';

export const auctionDraftSelect = {
  id: true,
  sellerId: true,
  categoryId: true,
  title: true,
  description: true,
  status: true,
  currency: true,
  startingPrice: true,
  reservePrice: true,
  minBidIncrement: true,
  currentPrice: true,
  scheduledStartAt: true,
  originalEndAt: true,
  currentEndAt: true,
  rowVersion: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.AuctionSelect;

export type AuctionDraftRecord = Prisma.AuctionGetPayload<{
  select: typeof auctionDraftSelect;
}>;
