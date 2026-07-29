'use client';

import {
  getPublicAuction,
  listHotAuctions,
  listPublicAuctions,
  ListPublicAuctionsParams,
} from '@/features/auctions/api/auctions.api';
import { useQuery } from '@tanstack/react-query';

export const auctionQueryKeys = {
  all: ['auction'] as const,
  publicLists: () => [...auctionQueryKeys.all, 'public-list'] as const,

  publicList: (params: ListPublicAuctionsParams) =>
    [...auctionQueryKeys.publicLists(), params] as const,

  hotLists: () => [...auctionQueryKeys.all, 'hot-list'] as const,

  hotlist: (limit: number) => [...auctionQueryKeys.hotLists(), limit] as const,

  detail: (auctionId: string) =>
    [...auctionQueryKeys.all, 'detail', auctionId] as const,
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
