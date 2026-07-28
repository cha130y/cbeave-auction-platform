export class AuctionExtensionTriggerBidDto {
  amount: string;
  sequenceNo: number;
  placedAt: Date;
}

export class AuctionExtendedEventDto {
  auctionId: string;
  extensionNumber: number;
  previousEndAt: Date;
  newEndAt: Date;
  extensionSeconds: number;
  triggeringBid: AuctionExtensionTriggerBidDto;
}
