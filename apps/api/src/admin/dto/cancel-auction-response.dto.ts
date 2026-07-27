import { AuctionStatus } from '../../generated/prisma/enums';

export class CancelAuctionResponseDto {
  id: string;
  sellerId: string;
  title: string;
  status: AuctionStatus;
  cancellationReason: string | null;
  endedAt: Date | null;
  rowVersion: number;
}
