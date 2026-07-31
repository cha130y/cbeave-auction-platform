'use client';

import {
  listNotificationsResponseSchema,
  notificationSchema,
  type ListNotificationsResponse,
  type Notification,
} from '@/features/notifications/schemas/notification.schemas';
import { apiRequest } from '@/lib/api/api-client';

export type ListNotificationsParams = {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
};

function createNotificationsQueryString(
  params: ListNotificationsParams,
): string {
  const searchParams = new URLSearchParams();

  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }

  if (params.unreadOnly !== undefined) {
    searchParams.set('unreadOnly', String(params.unreadOnly));
  }

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
}

export async function listNotifications(
  params: ListNotificationsParams = {},
): Promise<ListNotificationsResponse> {
  const queryString = createNotificationsQueryString(params);

  return listNotificationsResponseSchema.parse(
    await apiRequest<unknown>(`/notifications${queryString}`),
  );
}

export async function markNotificationRead(
  notificationId: string,
): Promise<Notification> {
  return notificationSchema.parse(
    await apiRequest<unknown>(
      `/notifications/${encodeURIComponent(notificationId)}/read`,
      {
        method: 'PATCH',
      },
    ),
  );
}
