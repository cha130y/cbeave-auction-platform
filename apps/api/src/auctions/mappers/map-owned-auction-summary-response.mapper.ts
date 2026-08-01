import { OwnedAuctionSummaryResponseDto } from '../dto/owned-auction-summary-response.dto';
import { OwnedAuctionSummaryRecord } from '../queries/owned-auction-summary.select';

export function mapOwnedAuctionSummaryResponse(
  auction: OwnedAuctionSummaryRecord,
): OwnedAuctionSummaryResponseDto {
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
    createdAt: auction.createdAt,
    updatedAt: auction.updatedAt,
    primaryImage: primaryImage
      ? {
          url: primaryImage.url,
          altText: primaryImage.altText,
        }
      : null,
    category: auction.category,
  };
}
