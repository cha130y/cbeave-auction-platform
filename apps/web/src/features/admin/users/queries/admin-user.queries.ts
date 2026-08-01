'use client';

import {
  listAdminUsers,
  reactivateAdminUser,
  suspendAdminUser,
  type ListAdminUsersParams,
} from '@/features/admin/users/api/admin-users.api';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

type AdminUserListOptions = Omit<ListAdminUsersParams, 'cursor'>;

export const adminUserQueryKeys = {
  all: ['admin', 'users'] as const,
  lists: () => [...adminUserQueryKeys.all, 'list'] as const,
  infiniteList: (params: AdminUserListOptions) =>
    [...adminUserQueryKeys.lists(), 'infinite', params] as const,
};

export function useInfiniteAdminUsers(
  params: AdminUserListOptions = {},
  enabled = true,
) {
  const limit = params.limit ?? 20;
  const status = params.status;

  return useInfiniteQuery({
    queryKey: adminUserQueryKeys.infiniteList({ limit, status }),
    queryFn: ({ pageParam }) =>
      listAdminUsers({
        cursor: pageParam ?? undefined,
        limit,
        status,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
}

function useChangeAdminUserStatus(
  mutationFn: typeof suspendAdminUser | typeof reactivateAdminUser,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminUserQueryKeys.lists(),
      });
    },
  });
}

export function useSuspendAdminUser() {
  return useChangeAdminUserStatus(suspendAdminUser);
}

export function useReactivateAdminUser() {
  return useChangeAdminUserStatus(reactivateAdminUser);
}
