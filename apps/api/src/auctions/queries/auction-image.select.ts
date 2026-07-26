import { Prisma } from '../../generated/prisma/client';

export const auctionImageSelect = {
  id: true,
  auctionId: true,
  url: true,
  altText: true,
  position: true,
  isPrimary: true,
  createdAt: true,
} satisfies Prisma.AuctionImageSelect;

export type AuctionImageRecord = Prisma.AuctionImageGetPayload<{
  select: typeof auctionImageSelect;
}>;
