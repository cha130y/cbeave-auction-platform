'use client';

import {
  listWatchlistResponseSchema,
  type ListWatchlistResponse,
  type WatchlistEntry,
  watchlistEntryResponseSchema,
} from '@/features/watchlists/schemas/watchlist.schemas';
import { apiRequest } from '@/lib/api/api-client';

export type ListWatchlistParams = {
  limit?: number;
  cursor?: string;
};

function createWatchlistQueryString(params: ListWatchlistParams): string {
  const searchParams = new URLSearchParams();

  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
}

export async function listWatchlist(
  params: ListWatchlistParams = {},
): Promise<ListWatchlistResponse> {
  const queryString = createWatchlistQueryString(params);

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
