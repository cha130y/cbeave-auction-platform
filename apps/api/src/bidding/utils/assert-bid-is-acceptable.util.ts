import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { AuctionStatus } from '../../generated/prisma/enums';
import { PlaceBidAuctionRecord } from '../queries/place-bid-auction.select';

/**
 * Rejects every bid the auction cannot accept, and returns the deadline the bid
 * was measured against so the caller does not have to prove again that it is
 * set. Order matters: a seller is told they may not bid on their own auction
 * before they are told the amount is too low.
 */
export function assertBidIsAcceptable(
  auction: PlaceBidAuctionRecord,
  amount: Prisma.Decimal,
  bidderId: string,
  now: Date,
): Date {
  if (auction.status !== AuctionStatus.ACTIVE) {
    throw new ConflictException('Auction is not active');
  }

  if (auction.sellerId === bidderId) {
    throw new ForbiddenException(
      'The auction seller cannot bid on this auction',
    );
  }

  if (
    !auction.currentEndAt ||
    auction.currentEndAt.getTime() <= now.getTime()
  ) {
    throw new ConflictException('Auction has ended');
  }

  const minimumBid = auction.currentPrice.plus(auction.minBidIncrement);

  if (amount.lt(minimumBid)) {
    throw new BadRequestException(
      `Bid amount must be at least ${minimumBid.toFixed(2)}`,
    );
  }

  return auction.currentEndAt;
}
