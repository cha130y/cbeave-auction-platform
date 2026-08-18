import { Prisma } from '../../generated/prisma/client';
import { maskBidderDisplayNameOrDefault } from '../utils/mask-bidder-display-name.util';

type PodiumBidSource = {
  sequenceNo: number;
  amount: Prisma.Decimal;
  bidder: Parameters<typeof maskBidderDisplayNameOrDefault>[0];
};

export type PodiumBidRecord = {
  sequenceNo: number;
  amount: string;
  bidderDisplayName: string;
};

export function mapPodiumBid(bid: PodiumBidSource): PodiumBidRecord {
  return {
    sequenceNo: bid.sequenceNo,
    amount: bid.amount.toFixed(2),
    bidderDisplayName: maskBidderDisplayNameOrDefault(bid.bidder),
  };
}
