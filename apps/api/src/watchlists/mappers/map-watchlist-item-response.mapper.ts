import { mapPublicAuctionSummaryResponse } from '../../auctions/mappers/map-public-auction-summary-response.mapper';
import { WatchlistItemResponseDto } from '../dto/list-watchlist-response.dto';
import { WatchlistItemRecord } from '../queries/watchlist-item.select';

export function mapWatchlistItemResponse(
  entry: WatchlistItemRecord,
): WatchlistItemResponseDto {
  return {
    watchedAt: entry.createdAt,
    auction: mapPublicAuctionSummaryResponse(entry.auction),
  };
}
