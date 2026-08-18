'use client';

import {
  listPublicBidsResponseSchema,
  placeBidResponseSchema,
  type ListPublicBidsResponse,
  type PlaceBidResponse,
} from '@/features/bidding/schemas/bidding.schemas';
import { apiRequest } from '@/lib/api/api-client';
import { createQueryString } from '@/lib/api/query-string';

export type ListPublicBidsParams = {
  auctionId: string;
  limit?: number;
  cursor?: number;
};

export type PlaceBidInput = {
  auctionId: string;
  amount: string;
};

export async function listPublicBids({
  auctionId,
  limit,
  cursor,
}: ListPublicBidsParams): Promise<ListPublicBidsResponse> {
  const queryString = createQueryString({
    limit,
    cursor,
  });

  return listPublicBidsResponseSchema.parse(
    await apiRequest<unknown>(
      `/auctions/${encodeURIComponent(auctionId)}/bids${queryString}`,
    ),
  );
}

export async function placeBid({
  auctionId,
  amount,
}: PlaceBidInput): Promise<PlaceBidResponse> {
  const clientRequestId = crypto.randomUUID();

  return placeBidResponseSchema.parse(
    await apiRequest<unknown>(
      `/auctions/${encodeURIComponent(auctionId)}/bids`,
      {
        method: 'POST',
        body: JSON.stringify({
          amount: amount.trim(),
          clientRequestId,
        }),
      },
    ),
  );
}
