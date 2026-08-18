import { AdminAuctionSummaryResponseDto } from '../dto/list-admin-auctions-response.dto';
import { AdminAuctionSummaryRecord } from '../queries/admin-auction-summary.select';
import { mapPrimaryImage } from '../../auctions/utils/map-primary-image.util';

export function mapAdminAuctionSummaryResponse(
  auction: AdminAuctionSummaryRecord,
): AdminAuctionSummaryResponseDto {
  return {
    id: auction.id,
    title: auction.title,
    status: auction.status,
    currency: auction.currency.trim(),
    currentPrice: auction.currentPrice.toFixed(2),
    bidCount: auction.bidCount,
    scheduledStartAt: auction.scheduledStartAt,
    currentEndAt: auction.currentEndAt,
    publishedAt: auction.publishedAt,
    endedAt: auction.endedAt,
    cancellationReason: auction.cancellationReason,
    createdAt: auction.createdAt,
    updatedAt: auction.updatedAt,
    primaryImage: mapPrimaryImage(auction.auctionImages[0]),
    category: auction.category,
    seller: {
      id: auction.seller.id,
      email: auction.seller.email,
      displayName:
        auction.seller.userProfile?.displayName ?? auction.seller.email,
    },
  };
}
