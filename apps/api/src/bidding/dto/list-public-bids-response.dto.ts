export class PublicBidResponseDto {
  sequenceNo: number;
  amount: string;
  placedAt: Date;
  bidderDisplayName: string;
}

export class ListPublicBidsResponseDto {
  items: PublicBidResponseDto[];
  nextCursor: number | null;
}
