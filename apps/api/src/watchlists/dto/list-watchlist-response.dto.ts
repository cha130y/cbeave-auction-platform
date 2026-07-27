import { PublicAuctionSummaryResponseDto } from '../../auctions/dto/public-auction-summary-response.dto';

export class WatchlistItemResponseDto {
  watchedAt: Date;
  auction: PublicAuctionSummaryResponseDto;
}

export class ListWatchlistResponseDto {
  items: WatchlistItemResponseDto[];
  nextCursor: string | null;
}
