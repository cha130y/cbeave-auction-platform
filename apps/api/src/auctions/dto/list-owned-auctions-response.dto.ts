import { OwnedAuctionSummaryResponseDto } from './owned-auction-summary-response.dto';

export class ListOwnedAuctionsResponseDto {
  items: OwnedAuctionSummaryResponseDto[];
  nextCursor: string | null;
}
