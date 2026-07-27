import { Prisma } from '../../generated/prisma/client';

export const adminCancellableAuctionSelect = {
  id: true,
  sellerId: true,
  title: true,
  status: true,
  cancellationReason: true,
  endedAt: true,
  rowVersion: true,
} satisfies Prisma.AuctionSelect;

export type AdminCancellableAuctionRecord = Prisma.AuctionGetPayload<{
  select: typeof adminCancellableAuctionSelect;
}>;
