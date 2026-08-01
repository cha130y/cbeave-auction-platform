'use client';

import {
  cancelAdminAuction,
  listAdminAuctions,
  type ListAdminAuctionsParams,
} from '@/features/admin/auctions/api/admin-auctions.api';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

type AdminAuctionListOptions = Omit<ListAdminAuctionsParams, 'cursor'>;

export const adminAuctionQueryKeys = {
  all: ['admin', 'auctions'] as const,

  lists: () => [...adminAuctionQueryKeys.all, 'list'] as const,

  infiniteList: (params: AdminAuctionListOptions) =>
    [...adminAuctionQueryKeys.lists(), 'infinite', params] as const,
};

export function useInfiniteAdminAuctions(
  params: AdminAuctionListOptions = {},
  enabled = true,
) {
  const limit = params.limit ?? 20;
  const status = params.status;

  return useInfiniteQuery({
    queryKey: adminAuctionQueryKeys.infiniteList({
      limit,
      status,
    }),

    queryFn: ({ pageParam }) =>
      listAdminAuctions({
        cursor: pageParam ?? undefined,
        limit,
        status,
      }),

    initialPageParam: null as string | null,

    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,

    enabled,
  });
}

export function useCancelAdminAuction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelAdminAuction,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminAuctionQueryKeys.lists(),
      });
    },
  });
}
