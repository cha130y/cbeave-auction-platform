import { AuctionStatus } from '../../generated/prisma/enums';

export class AdminAuctionPrimaryImageResponseDto {
  url: string;
  altText: string | null;
}

export class AdminAuctionCategoryResponseDto {
  id: string;
  name: string;
  slug: string;
}

export class AdminAuctionSellerResponseDto {
  id: string;
  email: string;
  displayName: string;
}

export class AdminAuctionSummaryResponseDto {
  id: string;
  title: string;
  status: AuctionStatus;
  currency: string;
  currentPrice: string;
  bidCount: number;
  scheduledStartAt: Date | null;
  currentEndAt: Date | null;
  publishedAt: Date | null;
  endedAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  primaryImage: AdminAuctionPrimaryImageResponseDto | null;
  category: AdminAuctionCategoryResponseDto;
  seller: AdminAuctionSellerResponseDto;
}

export class ListAdminAuctionsResponseDto {
  items: AdminAuctionSummaryResponseDto[];
  nextCursor: string | null;
}
