import { PublicBidResponseDto } from '../dto/list-public-bids-response.dto';
import { PublicBidHistoryRecord } from '../queries/public-bid-history.select';
import { maskBidderDisplayNameOrDefault } from '../utils/mask-bidder-display-name.util';

export function mapPublicBidHistoryResponse(
  bid: PublicBidHistoryRecord,
): PublicBidResponseDto {
  return {
    sequenceNo: bid.sequenceNo,
    amount: bid.amount.toFixed(2),
    placedAt: bid.placedAt,
    bidderDisplayName: maskBidderDisplayNameOrDefault(bid.bidder),
  };
}
