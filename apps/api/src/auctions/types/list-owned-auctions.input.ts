import { AuctionStatus } from '../../generated/prisma/enums';

export type ListOwnedAuctionsInput = {
  sellerId: string;
  cursor?: string;
  limit: number;
  status?: AuctionStatus;
};
