import { AuctionStatus } from '../../generated/prisma/enums';

export class AuctionStartedEventDto {
  auctionId: string;
  status: AuctionStatus;
  startedAt: string;
  currentEndAt: string;
}
