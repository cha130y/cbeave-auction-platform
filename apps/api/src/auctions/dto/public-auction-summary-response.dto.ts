import { AuctionStatus } from '../../generated/prisma/enums';

export class PublicAuctionImageResponseDto {
  url: string;
  altText: string | null;
}

export class PublicAuctionCategoryResponseDto {
  id: string;
  name: string;
  slug: string;
}

export class PublicAuctionSellerResponseDto {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export class PublicAuctionSummaryResponseDto {
  id: string;
  title: string;
  status: AuctionStatus;
  currency: string;
  startingPrice: string;
  currentPrice: string;
  bidCount: number;
  reserveMet: boolean;
  scheduledStartAt: Date;
  currentEndAt: Date;
  publishedAt: Date;
  primaryImage: PublicAuctionImageResponseDto;
  category: PublicAuctionCategoryResponseDto;
  seller: PublicAuctionSellerResponseDto;
}
