import { PublicAuctionDetailResponseDto } from '../dto/public-auction-detail-response.dto';
import { PublicAuctionDetailRecord } from '../queries/public-auction-detail.select';
import { deriveAuctionReserveMet } from '../utils/derive-auction-reserve-met.util';

export function mapPublicAuctionDetailResponse(
  auction: PublicAuctionDetailRecord,
): PublicAuctionDetailResponseDto {
  const primaryImageCount = auction.auctionImages.filter(
    (image) => image.isPrimary,
  ).length;

  if (
    !auction.scheduledStartAt ||
    !auction.originalEndAt ||
    !auction.currentEndAt ||
    !auction.publishedAt ||
    auction.auctionImages.length === 0 ||
    primaryImageCount !== 1
  ) {
    throw new Error('Public auction is missing required publication data');
  }

  return {
    id: auction.id,
    title: auction.title,
    description: auction.description,
    status: auction.status,
    currency: auction.currency.trim(),
    startingPrice: auction.startingPrice.toFixed(2),
    currentPrice: auction.currentPrice.toFixed(2),
    minBidIncrement: auction.minBidIncrement.toFixed(2),
    bidCount: auction.bidCount,
    reserveMet: deriveAuctionReserveMet(auction),
    scheduledStartAt: auction.scheduledStartAt,
    originalEndAt: auction.originalEndAt,
    currentEndAt: auction.currentEndAt,
    publishedAt: auction.publishedAt,
    startedAt: auction.startedAt,
    endedAt: auction.endedAt,
    extensionCount: auction.extensionCount,
    soldPrice: auction.soldPrice?.toFixed(2) ?? null,
    images: auction.auctionImages.map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.altText,
      position: image.position,
      isPrimary: image.isPrimary,
    })),
    category: auction.category,
    seller: {
      id: auction.seller.id,
      displayName: auction.seller.userProfile?.displayName ?? 'Seller',
      avatarUrl: auction.seller.userProfile?.avatarUrl ?? null,
    },
    winner: auction.winner
      ? {
          id: auction.winner.id,
          displayName: auction.winner.userProfile?.displayName ?? 'Winner',
          avatarUrl: auction.winner.userProfile?.avatarUrl ?? null,
        }
      : null,
  };
}
