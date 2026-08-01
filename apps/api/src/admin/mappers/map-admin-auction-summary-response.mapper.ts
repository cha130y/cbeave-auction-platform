import { AdminAuctionSummaryResponseDto } from '../dto/list-admin-auctions-response.dto';
import { AdminAuctionSummaryRecord } from '../queries/admin-auction-summary.select';

export function mapAdminAuctionSummaryResponse(
  auction: AdminAuctionSummaryRecord,
): AdminAuctionSummaryResponseDto {
  const primaryImage = auction.auctionImages[0] ?? null;

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
    primaryImage: primaryImage
      ? {
          url: primaryImage.url,
          altText: primaryImage.altText,
        }
      : null,
    category: auction.category,
    seller: {
      id: auction.seller.id,
      email: auction.seller.email,
      displayName:
        auction.seller.userProfile?.displayName ?? auction.seller.email,
    },
  };
}
