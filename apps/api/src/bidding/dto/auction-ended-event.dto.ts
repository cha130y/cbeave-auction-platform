import { AuctionStatus } from '../../generated/prisma/enums';

export class AuctionEndedEventDto {
  auctionId: string;
  status: AuctionStatus;
  currency: string;
  finalPrice: string;
  bidCount: number;
  reserveMet: boolean;
  endedAt: Date;
  winnerDisplayName: string | null;
}
