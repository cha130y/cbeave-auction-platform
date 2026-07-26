export class AuctionImageResponseDto {
  id: string;
  auctionId: string;
  url: string;
  altText: string | null;
  position: number;
  isPrimary: boolean;
  createdAt: Date;
}
