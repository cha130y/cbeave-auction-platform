'use client';

import {
  listWatchlistResponseSchema,
  type ListWatchlistResponse,
  type WatchlistEntry,
  watchlistEntryResponseSchema,
} from '@/features/watchlists/schemas/watchlist.schemas';
import { apiRequest } from '@/lib/api/api-client';
import { createQueryString } from '@/lib/api/query-string';

export type ListWatchlistParams = {
  limit?: number;
  cursor?: string;
};

export async function listWatchlist(
  params: ListWatchlistParams = {},
): Promise<ListWatchlistResponse> {
  const queryString = createQueryString(params);

  return listWatchlistResponseSchema.parse(
    await apiRequest<unknown>(`/watchlists${queryString}`),
  );
}

export async function watchAuction(auctionId: string): Promise<WatchlistEntry> {
  return watchlistEntryResponseSchema.parse(
    await apiRequest<unknown>(`/watchlists/${encodeURIComponent(auctionId)}`, {
      method: 'PUT',
    }),
  );
}

export async function unwatchAuction(auctionId: string): Promise<void> {
  await apiRequest<void>(`/watchlists/${encodeURIComponent(auctionId)}`, {
    method: 'DELETE',
  });
}
