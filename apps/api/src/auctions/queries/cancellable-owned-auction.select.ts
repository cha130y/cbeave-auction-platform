import { Prisma } from '../../generated/prisma/client';

export const cancellableOwnedAuctionSelect = {
  id: true,
  sellerId: true,
  title: true,
  status: true,
  cancellationReason: true,
  endedAt: true,
  rowVersion: true,
  _count: {
    select: {
      bids: true,
    },
  },
} satisfies Prisma.AuctionSelect;

export type CancellableOwnedAuctionRecord = Prisma.AuctionGetPayload<{
  select: typeof cancellableOwnedAuctionSelect;
}>;
