import { Prisma } from '../../generated/prisma/client';

export type AcceptedBidResult = {
  bid: {
    id: string;
    auctionId: string;
    clientRequestId: string;
    amount: Prisma.Decimal;
    sequenceNo: number;
    placedAt: Date;
  };
  auction: {
    currentPrice: Prisma.Decimal;
    reservePrice: Prisma.Decimal | null;
    bidCount: number;
    currentEndAt: Date;
  };

  extension: {
    extensionNumber: number;
    previousEndAt: Date;
    newEndAt: Date;
  } | null;
};
