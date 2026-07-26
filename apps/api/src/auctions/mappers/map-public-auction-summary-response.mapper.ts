import { PublicAuctionSummaryResponseDto } from '../dto/public-auction-summary-response.dto';
import { PublicAuctionSummaryRecord } from '../queries/public-auction-summary.select';
import { deriveAuctionReserveMet } from '../utils/derive-auction-reserve-met.util';

export function mapPublicAuctionSummaryResponse(
  auction: PublicAuctionSummaryRecord,
): PublicAuctionSummaryResponseDto {
  const primaryImage = auction.auctionImages[0];

  if (
    !auction.scheduledStartAt ||
    !auction.currentEndAt ||
    !auction.publishedAt ||
    !primaryImage
  ) {
    throw new Error('Public auction is missing required publication data');
  }

  const reserveMet = deriveAuctionReserveMet(auction);

  return {
    id: auction.id,
    title: auction.title,
    status: auction.status,
    currency: auction.currency.trim(),
    startingPrice: auction.startingPrice.toFixed(2),
    currentPrice: auction.currentPrice.toFixed(2),
    bidCount: auction.bidCount,
    reserveMet,
    scheduledStartAt: auction.scheduledStartAt,
    currentEndAt: auction.currentEndAt,
    publishedAt: auction.publishedAt,
    primaryImage: {
      url: primaryImage.url,
      altText: primaryImage.altText,
    },
    category: auction.category,
    seller: {
      id: auction.seller.id,
      displayName: auction.seller.userProfile?.displayName ?? 'seller',
      avatarUrl: auction.seller.userProfile?.avatarUrl ?? null,
    },
  };
}
