import { PublicAuctionSummaryResponseDto } from './public-auction-summary-response.dto';

export class ListPublicAuctionsResponseDto {
  items: PublicAuctionSummaryResponseDto[];
  nextCursor: string | null;
}
