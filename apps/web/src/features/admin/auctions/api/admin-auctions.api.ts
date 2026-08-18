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
import { createQueryString } from '@/lib/api/query-string';

export type ListAdminAuctionsParams = {
  cursor?: string;
  limit?: number;
  status?: AdminAuctionStatus;
};

export type CancelAdminAuctionParams = CancelAdminAuctionFormValues & {
  auctionId: string;
};

export async function listAdminAuctions(
  params: ListAdminAuctionsParams = {},
): Promise<ListAdminAuctionsResponse> {
  return listAdminAuctionsResponseSchema.parse(
    await apiRequest<unknown>(`/admin/auctions${createQueryString(params)}`),
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
