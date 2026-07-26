import { Prisma } from '../../generated/prisma/client';

type AuctionReserveState = {
  bidCount: number;
  currentPrice: Prisma.Decimal;
  reservePrice: Prisma.Decimal | null;
};

export function deriveAuctionReserveMet(auction: AuctionReserveState): boolean {
  return (
    auction.bidCount > 0 &&
    (auction.reservePrice === null ||
      auction.currentPrice.gte(auction.reservePrice))
  );
}
