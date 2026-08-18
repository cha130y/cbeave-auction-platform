import { Prisma } from '../../generated/prisma/client';
import { bidderDisplayNameSelect } from './bidder-display-name.select';

export const publicBidHistorySelect = {
  sequenceNo: true,
  amount: true,
  placedAt: true,
  bidder: bidderDisplayNameSelect,
} satisfies Prisma.BidSelect;

export type PublicBidHistoryRecord = Prisma.BidGetPayload<{
  select: typeof publicBidHistorySelect;
}>;
