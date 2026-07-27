export type CreateAuctionCancellationNotificationsInput = {
  userIds: string[];
  auctionId: string;
  auctionTitle: string;
  reason: string;
};
