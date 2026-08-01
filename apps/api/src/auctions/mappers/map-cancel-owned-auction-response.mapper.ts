import { CancelOwnedAuctionResponseDto } from '../dto/cancel-owned-auction-response.dto';
import type { CancellableOwnedAuctionRecord } from '../queries/cancellable-owned-auction.select';

export function mapCancelOwnedAuctionResponse(
  auction: CancellableOwnedAuctionRecord,
): CancelOwnedAuctionResponseDto {
  return {
    id: auction.id,
    sellerId: auction.sellerId,
    title: auction.title,
    status: auction.status,
    cancellationReason: auction.cancellationReason,
    endedAt: auction.endedAt,
    rowVersion: auction.rowVersion,
  };
}
