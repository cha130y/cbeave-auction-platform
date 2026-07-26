import { PublishAuctionResponseDto } from '../dto/publish-auction-response.dto';
import { PublishedAuctionRecord } from '../queries/publish-auction.select';

export function mapPublishAuctionResponse(
  auction: PublishedAuctionRecord,
): PublishAuctionResponseDto {
  if (
    !auction.scheduledStartAt ||
    !auction.currentEndAt ||
    !auction.publishedAt
  ) {
    throw new Error(
      'Published auction is missing required lifecycle timestamps',
    );
  }

  return {
    id: auction.id,
    status: auction.status,
    scheduledStartAt: auction.scheduledStartAt,
    currentEndAt: auction.currentEndAt,
    publishedAt: auction.publishedAt,
    startedAt: auction.startedAt,
    rowVersion: auction.rowVersion,
  };
}
