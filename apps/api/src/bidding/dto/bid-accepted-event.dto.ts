import { BidExtensionResponseDto } from './place-bid-response.dto';

export class BidAcceptedEventDto {
  auctionId: string;
  amount: string;
  sequenceNo: number;
  placedAt: Date;
  currentPrice: string;
  bidCount: number;
  reserveMet: boolean;
  currentEndAt: Date;
  extension: BidExtensionResponseDto | null;
}
