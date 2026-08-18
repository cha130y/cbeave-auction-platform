import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

export function assertValidAuctionPricing(
  startingPrice: Prisma.Decimal,
  minBidIncrement: Prisma.Decimal,
  reservePrice: Prisma.Decimal | null,
): void {
  if (startingPrice.lte(0) || minBidIncrement.lte(0) || reservePrice?.lte(0)) {
    throw new BadRequestException('Auction prices must be greater than zero');
  }

  if (reservePrice && reservePrice.lt(startingPrice)) {
    throw new BadRequestException(
      'Reserve price cannot be lower than starting price',
    );
  }
}
