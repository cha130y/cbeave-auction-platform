export class BidExtensionResponseDto {
  extensionNumber: number;
  previousEndAt: Date;
  newEndAt: Date;
}

export class PlaceBidResponseDto {
  id: string;
  auctionId: string;
  clientRequestId: string;
  amount: string;
  sequenceNo: number;
  placedAt: Date;
  currentPrice: string;
  bidCount: number;
  reserveMet: boolean;
  currentEndAt: Date;
  extension: BidExtensionResponseDto | null;
}
