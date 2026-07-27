export type ListNotificationsInput = {
  userId: string;
  cursor?: string;
  limit: number;
  unreadOnly: boolean;
};
