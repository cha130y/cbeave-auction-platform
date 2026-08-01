'use client';

import {
  cancelAdminAuctionResponseSchema,
  listAdminAuctionsResponseSchema,
  type AdminAuctionStatus,
  type CancelAdminAuctionFormValues,
  type CancelAdminAuctionResponse,
  type ListAdminAuctionsResponse,
} from '@/features/admin/auctions/schemas/admin-auction.schemas';
import { apiRequest } from '@/lib/api/api-client';

export type ListAdminAuctionsParams = {
  cursor?: string;
  limit?: number;
  status?: AdminAuctionStatus;
};

export type CancelAdminAuctionParams = CancelAdminAuctionFormValues & {
  auctionId: string;
};

function createAdminAuctionsQueryString(
  params: ListAdminAuctionsParams,
): string {
  const searchParams = new URLSearchParams();

  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }

  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.status) {
    searchParams.set('status', params.status);
  }

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
}

export async function listAdminAuctions(
  params: ListAdminAuctionsParams = {},
): Promise<ListAdminAuctionsResponse> {
  return listAdminAuctionsResponseSchema.parse(
    await apiRequest<unknown>(
      `/admin/auctions${createAdminAuctionsQueryString(params)}`,
    ),
  );
}

export async function cancelAdminAuction(
  input: CancelAdminAuctionParams,
): Promise<CancelAdminAuctionResponse> {
  return cancelAdminAuctionResponseSchema.parse(
    await apiRequest<unknown>(
      `/admin/auctions/${encodeURIComponent(input.auctionId)}/cancel`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          reason: input.reason,
        }),
      },
    ),
  );
}
