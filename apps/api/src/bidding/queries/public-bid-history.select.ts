import { Prisma } from '../../generated/prisma/client';

export const publicBidHistorySelect = {
  sequenceNo: true,
  amount: true,
  placedAt: true,
  bidder: {
    select: {
      userProfile: {
        select: {
          displayName: true,
        },
      },
    },
  },
} satisfies Prisma.BidSelect;

export type PublicBidHistoryRecord = Prisma.BidGetPayload<{
  select: typeof publicBidHistorySelect;
}>;
