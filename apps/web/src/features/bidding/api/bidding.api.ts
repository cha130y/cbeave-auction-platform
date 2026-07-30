'use client';

import {
  listPublicBidsResponseSchema,
  placeBidResponseSchema,
  type ListPublicBidsResponse,
  type PlaceBidResponse,
} from '@/features/bidding/schemas/bidding.schemas';
import { apiRequest } from '@/lib/api/api-client';

export type ListPublicBidsParams = {
  auctionId: string;
  limit?: number;
  cursor?: number;
};

export type PlaceBidInput = {
  auctionId: string;
  amount: string;
};

function createBidHistoryQueryString(
  params: Pick<ListPublicBidsParams, 'limit' | 'cursor'>,
): string {
  const searchParams = new URLSearchParams();

  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.cursor !== undefined) {
    searchParams.set('cursor', String(params.cursor));
  }

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
}

export async function listPublicBids({
  auctionId,
  limit,
  cursor,
}: ListPublicBidsParams): Promise<ListPublicBidsResponse> {
  const queryString = createBidHistoryQueryString({
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
