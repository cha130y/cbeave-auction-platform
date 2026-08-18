import { OwnedAuctionSummaryResponseDto } from '../dto/owned-auction-summary-response.dto';
import { OwnedAuctionSummaryRecord } from '../queries/owned-auction-summary.select';
import { mapPrimaryImage } from '../utils/map-primary-image.util';

export function mapOwnedAuctionSummaryResponse(
  auction: OwnedAuctionSummaryRecord,
): OwnedAuctionSummaryResponseDto {
  return {
    id: auction.id,
    title: auction.title,
    status: auction.status,
    currency: auction.currency.trim(),
    currentPrice: auction.currentPrice.toFixed(2),
    bidCount: auction.bidCount,
    scheduledStartAt: auction.scheduledStartAt,
    currentEndAt: auction.currentEndAt,
    createdAt: auction.createdAt,
    updatedAt: auction.updatedAt,
    primaryImage: mapPrimaryImage(auction.auctionImages[0]),
    category: auction.category,
  };
}
