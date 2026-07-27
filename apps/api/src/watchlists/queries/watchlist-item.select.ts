import { publicAuctionSummarySelect } from '../../auctions/queries/public-auction-summary.select';
import { Prisma } from '../../generated/prisma/client';

export const watchlistItemSelect = {
  auctionId: true,
  createdAt: true,
  auction: {
    select: publicAuctionSummarySelect,
  },
} satisfies Prisma.WatchlistSelect;

export type WatchlistItemRecord = Prisma.WatchlistGetPayload<{
  select: typeof watchlistItemSelect;
}>;
