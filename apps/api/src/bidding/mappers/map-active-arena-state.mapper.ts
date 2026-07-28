import { deriveAuctionReserveMet } from '../../auctions/utils/derive-auction-reserve-met.util';
import { UserRole } from '../../generated/prisma/enums';
import {
  ActiveArenaLeaderDto,
  ActiveArenaStateDto,
} from '../dto/active-arena-state.dto';
import { ActiveArenaStateRecord } from '../queries/active-arena-state.select';
import { maskBidderDisplayName } from '../utils/mask-bidder-display-name.util';
import { mapPublicBidHistoryResponse } from './map-public-bid-history-response.mapper';

export function mapActiveArenaState(
  auction: ActiveArenaStateRecord,
  viewerUserId: string,
  viewerRole: UserRole,
  participantCount: number,
): ActiveArenaStateDto {
  if (!auction.startedAt || !auction.currentEndAt) {
    throw new Error('Active auction is missing lifecycle timestamps');
  }

  const highestBid = auction.bids[0] ?? null;

  const leader: ActiveArenaLeaderDto | null = highestBid
    ? {
        bidderDisplayName: maskBidderDisplayName(
          highestBid.bidder.userProfile?.displayName ?? 'Bidder',
        ),
        amount: highestBid.amount.toFixed(2),
      }
    : null;

  return {
    auctionId: auction.id,
    title: auction.title,
    status: auction.status,
    currency: auction.currency,
    currentPrice: auction.currentPrice.toFixed(2),
    minimumNextBid: auction.currentPrice
      .plus(auction.minBidIncrement)
      .toFixed(2),
    bidCount: auction.bidCount,
    reserveMet: deriveAuctionReserveMet(auction),
    startedAt: auction.startedAt,
    currentEndAt: auction.currentEndAt,
    extensionCount: auction.extensionCount,
    participantCount,
    canBid: viewerRole === UserRole.USER && auction.sellerId !== viewerUserId,
    leader,
    // Create a copy, then reverse it for an oldest-to-newest UI feed.
    recentBids: [...auction.bids].reverse().map(mapPublicBidHistoryResponse),
  };
}
