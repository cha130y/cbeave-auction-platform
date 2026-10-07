import { AuctionStatus } from '../../generated/prisma/enums';

/**
 * The statuses an auction may hold while the marketplace still shows it to
 * anyone. DRAFT belongs to its seller alone and CANCELLED has been withdrawn,
 * so neither appears in a public list, a public detail, a public bid history,
 * or a watchlist entry. Every read serving the public filters on this list, so
 * it lives here rather than beside any one of them.
 */
export const PUBLIC_AUCTION_STATUSES: AuctionStatus[] = [
  AuctionStatus.SCHEDULED,
  AuctionStatus.ACTIVE,
  AuctionStatus.SOLD,
  AuctionStatus.UNSOLD,
];
