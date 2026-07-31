'use client';

import {
  listNotifications,
  markNotificationRead,
  type ListNotificationsParams,
} from '@/features/notifications/api/notifications.api';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

type NotificationListOptions = Omit<ListNotificationsParams, 'cursor'>;

export const notificationQueryKeys = {
  all: ['notifications'] as const,

  lists: () => [...notificationQueryKeys.all, 'list'] as const,

  infiniteList: (params: NotificationListOptions) =>
    [...notificationQueryKeys.lists(), 'infinite', params] as const,
};

export function useInfiniteNotifications(
  params: NotificationListOptions = {},
  enabled = true,
) {
  const limit = params.limit ?? 20;
  const unreadOnly = params.unreadOnly ?? false;

  return useInfiniteQuery({
    queryKey: notificationQueryKeys.infiniteList({
      limit,
      unreadOnly,
    }),

    queryFn: ({ pageParam }) =>
      listNotifications({
        limit,
        unreadOnly,
        //first pageParam is null
        cursor: pageParam ?? undefined,
      }),

    initialPageParam: null as string | null,

    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,

    //determines whether the request is allowed to run.
    //authStatus = authenticated ==> enabled = true ==> GET /notifications
    enabled,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.lists(),
      });
    },
  });
}
