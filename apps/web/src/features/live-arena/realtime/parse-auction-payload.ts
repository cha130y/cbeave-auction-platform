import type { ZodType } from 'zod';

/**
 * Validates a socket payload and rejects events belonging to another auction
 * room, so a shared socket connection cannot leak state between auctions.
 */
export function parseAuctionPayload<T extends { auctionId: string }>(
  schema: ZodType<T>,
  payload: unknown,
  auctionId: string,
): T | null {
  const result = schema.safeParse(payload);

  if (!result.success || result.data.auctionId !== auctionId) {
    return null;
  }

  return result.data;
}
