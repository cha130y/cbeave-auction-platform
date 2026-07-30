'use client';

import {
  listWatchlist,
  type ListWatchlistParams,
  unwatchAuction,
  watchAuction,
} from '@/features/watchlists/api/watchlists.api';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export const watchlistQueryKeys = {
  all: ['watchlist'] as const,

  lists: () => [...watchlistQueryKeys.all, 'list'] as const,

  list: (params: ListWatchlistParams) =>
    [...watchlistQueryKeys.lists(), params] as const,

  infiniteList: (limit: number) =>
    [...watchlistQueryKeys.lists(), 'infinite', limit] as const,
};

export function useWatchlist(params: ListWatchlistParams = {}, enabled = true) {
  return useQuery({
    queryKey: watchlistQueryKeys.list(params),
    queryFn: () => listWatchlist(params),
    enabled,
  });
}

export function useInfiniteWatchlist(limit = 12, enabled = true) {
  return useInfiniteQuery({
    queryKey: watchlistQueryKeys.infiniteList(limit),

    queryFn: ({ pageParam }) =>
      listWatchlist({
        limit,
        cursor: pageParam ?? undefined,
      }),

    initialPageParam: null as string | null,

    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,

    enabled,
  });
}

export function useWatchAuction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: watchAuction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: watchlistQueryKeys.lists(),
      });
    },
  });
}

export function useUnwatchAuction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unwatchAuction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: watchlistQueryKeys.lists(),
      });
    },
  });
}
