import { AuctionExtendedEventDto } from '../dto/auction-extended-event.dto';
import { BidAcceptedEventDto } from '../dto/bid-accepted-event.dto';

export function mapAuctionExtendedEvent(
  bidEvent: BidAcceptedEventDto,
): AuctionExtendedEventDto | null {
  const extension = bidEvent.extension;

  if (!extension) {
    return null;
  }

  const extensionSeconds = Math.round(
    (extension.newEndAt.getTime() - extension.previousEndAt.getTime()) / 1000,
  );

  return {
    auctionId: bidEvent.auctionId,
    extensionNumber: extension.extensionNumber,
    previousEndAt: extension.previousEndAt,
    newEndAt: extension.newEndAt,
    extensionSeconds,
    triggeringBid: {
      amount: bidEvent.amount,
      sequenceNo: bidEvent.sequenceNo,
      placedAt: bidEvent.placedAt,
    },
  };
}
