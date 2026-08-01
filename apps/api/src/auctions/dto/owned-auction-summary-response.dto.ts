import { AuctionStatus } from '../../generated/prisma/enums';

export class OwnedAuctionPrimaryImageResponseDto {
  url: string;
  altText: string | null;
}

export class OwnedAuctionCategoryResponseDto {
  id: string;
  name: string;
  slug: string;
}

export class OwnedAuctionSummaryResponseDto {
  id: string;
  title: string;
  status: AuctionStatus;
  currency: string;
  currentPrice: string;
  bidCount: number;
  scheduledStartAt: Date | null;
  currentEndAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  primaryImage: OwnedAuctionPrimaryImageResponseDto | null;
  category: OwnedAuctionCategoryResponseDto;
}
