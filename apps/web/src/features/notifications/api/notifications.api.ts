'use client';

import {
  listNotificationsResponseSchema,
  notificationSchema,
  type ListNotificationsResponse,
  type Notification,
} from '@/features/notifications/schemas/notification.schemas';
import { apiRequest } from '@/lib/api/api-client';
import { createQueryString } from '@/lib/api/query-string';

export type ListNotificationsParams = {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
};

export async function listNotifications(
  params: ListNotificationsParams = {},
): Promise<ListNotificationsResponse> {
  const queryString = createQueryString(params);

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
