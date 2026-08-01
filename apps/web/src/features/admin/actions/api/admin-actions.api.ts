'use client';

import {
  listAdminActionsResponseSchema,
  type AdminActionType,
  type ListAdminActionsResponse,
} from '@/features/admin/actions/schemas/admin-action.schemas';
import { apiRequest } from '@/lib/api/api-client';

export type ListAdminActionsParams = {
  cursor?: string;
  limit?: number;
  actionType?: AdminActionType;
};

function createAdminActionsQueryString(params: ListAdminActionsParams): string {
  const searchParams = new URLSearchParams();

  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }

  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.actionType) {
    searchParams.set('actionType', params.actionType);
  }

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
}

export async function listAdminActions(
  params: ListAdminActionsParams = {},
): Promise<ListAdminActionsResponse> {
  return listAdminActionsResponseSchema.parse(
    await apiRequest<unknown>(
      `/admin/actions${createAdminActionsQueryString(params)}`,
    ),
  );
}
