import { PublicBidResponseDto } from '../dto/list-public-bids-response.dto';
import { PublicBidHistoryRecord } from '../queries/public-bid-history.select';
import { maskBidderDisplayName } from '../utils/mask-bidder-display-name.util';

export function mapPublicBidHistoryResponse(
  bid: PublicBidHistoryRecord,
): PublicBidResponseDto {
  const displayName = bid.bidder.userProfile?.displayName ?? 'Bidder';

  return {
    sequenceNo: bid.sequenceNo,
    amount: bid.amount.toFixed(2),
    placedAt: bid.placedAt,
    bidderDisplayName: maskBidderDisplayName(displayName),
  };
}
