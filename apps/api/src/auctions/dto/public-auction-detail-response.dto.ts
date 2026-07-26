import { AuctionStatus } from '../../generated/prisma/enums';
import {
  PublicAuctionCategoryResponseDto,
  PublicAuctionSellerResponseDto,
} from './public-auction-summary-response.dto';

export class PublicAuctionDetailImageResponseDto {
  id: string;
  url: string;
  altText: string | null;
  position: number;
  isPrimary: boolean;
}

export class PublicAuctionWinnerResponseDto {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export class PublicAuctionDetailResponseDto {
  id: string;
  title: string;
  description: string;
  status: AuctionStatus;
  currency: string;
  startingPrice: string;
  currentPrice: string;
  minBidIncrement: string;
  bidCount: number;
  reserveMet: boolean;
  scheduledStartAt: Date;
  originalEndAt: Date;
  currentEndAt: Date;
  publishedAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  extensionCount: number;
  soldPrice: string | null;
  images: PublicAuctionDetailImageResponseDto[];
  category: PublicAuctionCategoryResponseDto;
  seller: PublicAuctionSellerResponseDto;
  winner: PublicAuctionWinnerResponseDto | null;
}
