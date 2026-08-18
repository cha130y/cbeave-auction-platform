import { Prisma } from '../../generated/prisma/client';
import { AuctionStatus } from '../../generated/prisma/client';

export const ownedDraftImageCountSelect = {
  _count: {
    select: {
      auctionImages: true,
    },
  },
} satisfies Prisma.AuctionSelect;

export function ownedDraftWhere(
  auctionId: string,
  sellerId: string,
): Prisma.AuctionWhereInput {
  return {
    id: auctionId,
    sellerId,
    status: AuctionStatus.DRAFT,
    deletedAt: null,
  };
}
