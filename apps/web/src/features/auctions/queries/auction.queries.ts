'use client';

import {
  deleteOwnedAuctionDraft,
  getOwnedAuctionDraft,
  getPublicAuction,
  listHotAuctions,
  listOwnedAuctions,
  listPublicAuctions,
  cancelOwnedAuction,
  type ListOwnedAuctionsParams,
  type ListPublicAuctionsParams,
} from '@/features/auctions/api/auctions.api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const auctionQueryKeys = {
  all: ['auction'] as const,
  publicLists: () => [...auctionQueryKeys.all, 'public-list'] as const,

  publicList: (params: ListPublicAuctionsParams) =>
    [...auctionQueryKeys.publicLists(), params] as const,

  hotLists: () => [...auctionQueryKeys.all, 'hot-list'] as const,

  hotlist: (limit: number) => [...auctionQueryKeys.hotLists(), limit] as const,

  detail: (auctionId: string) =>
    [...auctionQueryKeys.all, 'detail', auctionId] as const,

  drafts: () => [...auctionQueryKeys.all, 'draft'] as const,

  draft: (auctionId: string) =>
    [...auctionQueryKeys.drafts(), auctionId] as const,

  ownedLists: () => [...auctionQueryKeys.all, 'owned-list'] as const,

  ownedList: (params: ListOwnedAuctionsParams) =>
    [...auctionQueryKeys.ownedLists(), params] as const,
};

export function usePublicAuctions(params: ListPublicAuctionsParams) {
  return useQuery({
    queryKey: auctionQueryKeys.publicList(params),
    queryFn: () => listPublicAuctions(params),
  });
}

export function useHotAuctions(limit = 10) {
  return useQuery({
    queryKey: auctionQueryKeys.hotlist(limit),
    queryFn: () => listHotAuctions(limit),
  });
}

export function usePublicAuction(auctionId: string) {
  return useQuery({
    queryKey: auctionQueryKeys.detail(auctionId),
    queryFn: () => getPublicAuction(auctionId),
  });
}

export function useOwnedAuctions(params: ListOwnedAuctionsParams) {
  return useQuery({
    queryKey: auctionQueryKeys.ownedList(params),
    queryFn: () => listOwnedAuctions(params),
  });
}

export function useOwnedAuctionDraft(auctionId: string) {
  return useQuery({
    queryKey: auctionQueryKeys.draft(auctionId),
    queryFn: () => getOwnedAuctionDraft(auctionId),
    enabled: auctionId.length > 0,
  });
}

export function useDeleteOwnedAuctionDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOwnedAuctionDraft,
    onSuccess: async (_result, auctionId) => {
      queryClient.removeQueries({
        queryKey: auctionQueryKeys.draft(auctionId),
      });

      await queryClient.invalidateQueries({
        queryKey: auctionQueryKeys.ownedLists(),
      });
    },
  });
}

export function useCancelOwnedAuction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelOwnedAuction,

    //It removes the obsolete public detail cache, marks the affected lists as outdated, then those active lists fetch fresh data from the backend.
    onSuccess: async (cancelledAuction) => {
      queryClient.removeQueries({
        queryKey: auctionQueryKeys.detail(cancelledAuction.id),
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: auctionQueryKeys.ownedLists(),
        }),

        queryClient.invalidateQueries({
          queryKey: auctionQueryKeys.publicLists(),
        }),

        queryClient.invalidateQueries({
          queryKey: auctionQueryKeys.hotLists(),
        }),
      ]);
    },
  });
}
