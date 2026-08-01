import { AuctionStatus } from '../../generated/prisma/enums';

export class CancelOwnedAuctionResponseDto {
  id: string;
  sellerId: string;
  title: string;
  status: AuctionStatus;
  cancellationReason: string | null;
  endedAt: Date | null;
  rowVersion: number;
}
