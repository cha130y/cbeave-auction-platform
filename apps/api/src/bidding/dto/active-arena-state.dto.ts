import { AuctionStatus } from '../../generated/prisma/enums';
import { PublicBidResponseDto } from './list-public-bids-response.dto';

export class ActiveArenaLeaderDto {
  bidderDisplayName: string;
  amount: string;
}

export class ActiveArenaStateDto {
  auctionId: string;
  title: string;
  status: AuctionStatus;
  currency: string;
  currentPrice: string;
  minimumNextBid: string;
  bidCount: number;
  reserveMet: boolean;
  startedAt: Date;
  currentEndAt: Date;
  extensionCount: number;
  participantCount: number;
  canBid: boolean;
  isCurrentUserLeading: boolean;
  leader: ActiveArenaLeaderDto | null;
  recentBids: PublicBidResponseDto[];
}
