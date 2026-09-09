import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { assertValidAuctionPricing } from './assert-valid-auction-pricing.util';

describe('assertValidAuctionPricing', () => {
  const decimal = (value: string): Prisma.Decimal => new Prisma.Decimal(value);

  it('accepts an auction without a reserve price', () => {
    expect(() =>
      assertValidAuctionPricing(decimal('100.00'), decimal('10.00'), null),
    ).not.toThrow();
  });

  it('accepts a reserve price equal to the starting price', () => {
    expect(() =>
      assertValidAuctionPricing(
        decimal('100.00'),
        decimal('10.00'),
        decimal('100.00'),
      ),
    ).not.toThrow();
  });

  it('accepts the smallest positive amounts', () => {
    expect(() =>
      assertValidAuctionPricing(decimal('0.01'), decimal('0.01'), null),
    ).not.toThrow();
  });

  it.each([
    ['a zero starting price', '0.00', '10.00', null],
    ['a negative starting price', '-1.00', '10.00', null],
    ['a zero minimum increment', '100.00', '0.00', null],
    ['a negative minimum increment', '100.00', '-1.00', null],
    ['a zero reserve price', '100.00', '10.00', '0.00'],
    ['a negative reserve price', '100.00', '10.00', '-1.00'],
  ])(
    'rejects %s',
    (
      _case: string,
      startingPrice: string,
      minBidIncrement: string,
      reservePrice: string | null,
    ) => {
      expect(() =>
        assertValidAuctionPricing(
          decimal(startingPrice),
          decimal(minBidIncrement),
          reservePrice === null ? null : decimal(reservePrice),
        ),
      ).toThrow(BadRequestException);

      expect(() =>
        assertValidAuctionPricing(
          decimal(startingPrice),
          decimal(minBidIncrement),
          reservePrice === null ? null : decimal(reservePrice),
        ),
      ).toThrow('Auction prices must be greater than zero');
    },
  );

  it('rejects a reserve price below the starting price', () => {
    expect(() =>
      assertValidAuctionPricing(
        decimal('100.00'),
        decimal('10.00'),
        decimal('99.99'),
      ),
    ).toThrow('Reserve price cannot be lower than starting price');
  });
});
