'use client';

import { auctionQueryKeys } from '@/features/auctions/queries/auction.queries';
import { listPublicBids, placeBid } from '@/features/bidding/api/bidding.api';
import { watchlistQueryKeys } from '@/features/watchlists/queries/watchlist.queries';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

export const biddingQueryKeys = {
  all: ['bidding'] as const,

  histories: () => [...biddingQueryKeys.all, 'history'] as const,

  history: (auctionId: string, limit: number) =>
    [...biddingQueryKeys.histories(), auctionId, limit] as const,
};

export function useInfinitePublicBids(
  auctionId: string,
  limit = 20,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: biddingQueryKeys.history(auctionId, limit),

    queryFn: ({ pageParam }) =>
      listPublicBids({
        auctionId,
        limit,
        cursor: pageParam ?? undefined,
      }),

    initialPageParam: null as number | null,

    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,

    enabled: enabled && auctionId.length > 0,
  });
}

export function usePlaceBid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: placeBid,

    onSuccess: async (acceptedBid) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: biddingQueryKeys.histories(),
        }),

        queryClient.invalidateQueries({
          queryKey: auctionQueryKeys.all,
        }),

        queryClient.invalidateQueries({
          queryKey: watchlistQueryKeys.all,
        }),
      ]);

      return acceptedBid;
    },
  });
}
