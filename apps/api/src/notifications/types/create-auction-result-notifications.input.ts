type SoldAuctionResult = {
  sold: true;
  winnerUserId: string;
  winningBidId: string;
  soldPrice: string;
};

type UnsoldAuctionResult = {
  sold: false;
  highestBidId: string | null;
};

export type CreateAuctionResultNotificationsInput = {
  auctionId: string;
  auctionTitle: string;
  sellerId: string;
  currency: string;
  result: SoldAuctionResult | UnsoldAuctionResult;
};
