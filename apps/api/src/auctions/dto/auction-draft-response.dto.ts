import { AuctionStatus } from '../../generated/prisma/enums';

export class AuctionDraftCategoryResponseDto {
  id: string;
  name: string;
  slug: string;
}

export class AuctionDraftResponseDto {
  id: string;
  sellerId: string;
  categoryId: string;
  title: string;
  description: string;
  status: AuctionStatus;
  currency: string;
  startingPrice: string;
  reservePrice: string | null;
  minBidIncrement: string;
  currentPrice: string;
  scheduledStartAt: Date | null;
  originalEndAt: Date | null;
  currentEndAt: Date | null;
  rowVersion: number;
  createdAt: Date;
  updatedAt: Date;
  category: AuctionDraftCategoryResponseDto;
}
