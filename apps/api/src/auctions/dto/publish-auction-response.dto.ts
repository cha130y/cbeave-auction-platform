import { AuctionStatus } from '../../generated/prisma/enums';

export class PublishAuctionResponseDto {
  id: string;
  status: AuctionStatus;
  scheduledStartAt: Date;
  currentEndAt: Date;
  publishedAt: Date;
  startedAt: Date | null;
  rowVersion: number;
}
