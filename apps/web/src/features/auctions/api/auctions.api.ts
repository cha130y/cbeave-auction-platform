'use client';

import {
  ListHotAuctionsResponse,
  listHotAuctionsResponseSchema,
  ListPublicAuctionsResponse,
  listPublicAuctionsResponseSchema,
  PublicAuctionDetail,
  publicAuctionDetailSchema,
} from '@/features/auctions/schemas/auction.schemas';
import { apiRequest } from '@/lib/api/api-client';

export type ListPublicAuctionsParams = {
  limit?: number;
  categoryId?: string;
  cursor?: string;
};

function createQueryString(
  params: Record<string, string | number | undefined>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
}

export async function listPublicAuctions(
  params: ListPublicAuctionsParams = {},
): Promise<ListPublicAuctionsResponse> {
  const queryString = createQueryString(params);

  return listPublicAuctionsResponseSchema.parse(
    await apiRequest<unknown>(`/auctions${queryString}`),
  );
}

export async function listHotAuctions(
  limit = 10,
): Promise<ListHotAuctionsResponse> {
  const queryString = createQueryString({ limit });

  return listHotAuctionsResponseSchema.parse(
    await apiRequest<unknown>(`/auctions/hot${queryString}`),
  );
}

export async function getPublicAuction(
  auctionId: string,
): Promise<PublicAuctionDetail> {
  return publicAuctionDetailSchema.parse(
    //encodeURIComponent() prevents unexpected route characters from changing the requested path
    await apiRequest<unknown>(`/auctions/${encodeURIComponent(auctionId)}`),
  );
}
