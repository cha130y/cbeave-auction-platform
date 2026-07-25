import { AuctionDraftResponseDto } from '../dto/auction-draft-response.dto';
import { AuctionDraftRecord } from '../queries/auction-draft.select';

export function mapAuctionDraftResponse(
  auction: AuctionDraftRecord,
): AuctionDraftResponseDto {
  return {
    id: auction.id,
    sellerId: auction.sellerId,
    categoryId: auction.categoryId,
    title: auction.title,
    description: auction.description,
    status: auction.status,
    currency: auction.currency.trim(),
    startingPrice: auction.startingPrice.toFixed(2),
    reservePrice: auction.reservePrice?.toFixed(2) ?? null,
    minBidIncrement: auction.minBidIncrement.toFixed(2),
    currentPrice: auction.currentPrice.toFixed(2),
    scheduledStartAt: auction.scheduledStartAt,
    originalEndAt: auction.originalEndAt,
    currentEndAt: auction.currentEndAt,
    rowVersion: auction.rowVersion,
    createdAt: auction.createdAt,
    updatedAt: auction.updatedAt,
    category: auction.category,
  };
}
