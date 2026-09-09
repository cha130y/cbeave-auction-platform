import { Prisma } from '../../generated/prisma/client';
import { deriveAuctionReserveMet } from './derive-auction-reserve-met.util';

describe('deriveAuctionReserveMet', () => {
  const decimal = (value: string): Prisma.Decimal => new Prisma.Decimal(value);

  it('is false while the auction has no bids, even without a reserve price', () => {
    expect(
      deriveAuctionReserveMet({
        bidCount: 0,
        currentPrice: decimal('100.00'),
        reservePrice: null,
      }),
    ).toBe(false);
  });

  it('is false while the auction has no bids, even above the reserve price', () => {
    expect(
      deriveAuctionReserveMet({
        bidCount: 0,
        currentPrice: decimal('500.00'),
        reservePrice: decimal('100.00'),
      }),
    ).toBe(false);
  });

  it('is true once a bid exists and no reserve price was set', () => {
    expect(
      deriveAuctionReserveMet({
        bidCount: 1,
        currentPrice: decimal('100.00'),
        reservePrice: null,
      }),
    ).toBe(true);
  });

  it('is true when the current price equals the reserve price', () => {
    expect(
      deriveAuctionReserveMet({
        bidCount: 3,
        currentPrice: decimal('250.00'),
        reservePrice: decimal('250.00'),
      }),
    ).toBe(true);
  });

  it('compares by decimal value rather than by string form', () => {
    expect(
      deriveAuctionReserveMet({
        bidCount: 3,
        currentPrice: decimal('250.0000'),
        reservePrice: decimal('250'),
      }),
    ).toBe(true);
  });

  it('is false when the current price is a fraction below the reserve price', () => {
    expect(
      deriveAuctionReserveMet({
        bidCount: 3,
        currentPrice: decimal('249.99'),
        reservePrice: decimal('250.00'),
      }),
    ).toBe(false);
  });
});
