import { Prisma } from '../../generated/prisma/client';

export const publishAuctionSelect = {
  id: true,
  status: true,
  scheduledStartAt: true,
  currentEndAt: true,
  publishedAt: true,
  startedAt: true,
  rowVersion: true,
} satisfies Prisma.AuctionSelect;

export type PublishedAuctionRecord = Prisma.AuctionGetPayload<{
  select: typeof publishAuctionSelect;
}>;
