'use client';

import {
  listAdminActionsResponseSchema,
  type AdminActionType,
  type ListAdminActionsResponse,
} from '@/features/admin/actions/schemas/admin-action.schemas';
import { apiRequest } from '@/lib/api/api-client';
import { createQueryString } from '@/lib/api/query-string';

export type ListAdminActionsParams = {
  cursor?: string;
  limit?: number;
  actionType?: AdminActionType;
};

export async function listAdminActions(
  params: ListAdminActionsParams = {},
): Promise<ListAdminActionsResponse> {
  return listAdminActionsResponseSchema.parse(
    await apiRequest<unknown>(`/admin/actions${createQueryString(params)}`),
  );
}
