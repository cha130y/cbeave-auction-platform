import { BidAcceptedEventDto } from '../dto/bid-accepted-event.dto';
import { PlaceBidResponseDto } from '../dto/place-bid-response.dto';

export function mapBidAcceptedEvent(
  response: PlaceBidResponseDto,
): BidAcceptedEventDto {
  return {
    auctionId: response.auctionId,
    amount: response.amount,
    sequenceNo: response.sequenceNo,
    placedAt: response.placedAt,
    currentPrice: response.currentPrice,
    bidCount: response.bidCount,
    reserveMet: response.reserveMet,
    currentEndAt: response.currentEndAt,
    extension: response.extension,
  };
}
