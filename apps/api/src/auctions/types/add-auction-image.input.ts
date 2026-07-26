export type AddAuctionImageInput = {
  auctionId: string;
  sellerId: string;
  fileBuffer: Buffer;
  altText?: string;
};
