'use client';

import {
  listAdminActions,
  ListAdminActionsParams,
} from '@/features/admin/actions/api/admin-actions.api';
import type { ListAdminActionsResponse } from '@/features/admin/actions/schemas/admin-action.schemas';
import { cursorPagination } from '@/lib/api/cursor-pagination';
import { useInfiniteQuery } from '@tanstack/react-query';

type AdminActionListOptions = Omit<ListAdminActionsParams, 'cursor'>;

export const adminActionQueryKeys = {
  all: ['admin', 'actions'] as const,

  lists: () => [...adminActionQueryKeys.all, 'list'] as const,

  infiniteList: (params: AdminActionListOptions) =>
    [...adminActionQueryKeys.lists(), 'infinite', params] as const,
};

export function useInfiniteAdminActions(
  params: AdminActionListOptions = {},
  enabled = true,
) {
  const limit = params.limit ?? 20;
  const actionType = params.actionType;

  return useInfiniteQuery({
    queryKey: adminActionQueryKeys.infiniteList({
      limit,
      actionType,
    }),

    queryFn: ({ pageParam }) =>
      listAdminActions({
        cursor: pageParam ?? undefined,
        limit,
        actionType,
      }),

    ...cursorPagination<ListAdminActionsResponse>(),

    enabled,
  });
}
