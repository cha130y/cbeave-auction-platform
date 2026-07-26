import { AuctionImageResponseDto } from '../dto/auction-image-response.dto';
import { AuctionImageRecord } from '../queries/auction-image.select';

export function mapAuctionImageResponse(
  image: AuctionImageRecord,
): AuctionImageResponseDto {
  return {
    id: image.id,
    auctionId: image.auctionId,
    url: image.url,
    altText: image.altText,
    position: image.position,
    isPrimary: image.isPrimary,
    createdAt: image.createdAt,
  };
}
