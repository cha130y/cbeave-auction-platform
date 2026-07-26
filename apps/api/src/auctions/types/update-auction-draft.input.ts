export type UpdateAuctionDraftInput = {
  auctionId: string;
  sellerId: string;
  categoryId?: string;
  title?: string;
  description?: string;
  startingPrice?: string;
  reservePrice?: string | null;
  minBidIncrement?: string;
  scheduledStartAt?: Date | null;
  scheduledEndAt?: Date | null;
};
