import { deriveAuctionReserveMet } from '../../auctions/utils/derive-auction-reserve-met.util';
import { PlaceBidResponseDto } from '../dto/place-bid-response.dto';
import { AcceptedBidResult } from '../types/accepted-bid-result.type';

export function mapPlaceBidResponse(
  result: AcceptedBidResult,
): PlaceBidResponseDto {
  return {
    id: result.bid.id,
    auctionId: result.bid.auctionId,
    clientRequestId: result.bid.clientRequestId,
    amount: result.bid.amount.toFixed(2),
    sequenceNo: result.bid.sequenceNo,
    placedAt: result.bid.placedAt,
    currentPrice: result.auction.currentPrice.toFixed(2),
    bidCount: result.auction.bidCount,
    reserveMet: deriveAuctionReserveMet(result.auction),
    currentEndAt: result.auction.currentEndAt,
    extension: result.extension,
  };
}
