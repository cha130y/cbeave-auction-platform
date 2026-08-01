import { AuctionStatus } from '../../generated/prisma/enums';

export type ListAdminAuctionsInput = {
  cursor?: string;
  limit: number;
  status?: AuctionStatus;
};
