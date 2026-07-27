import { NotificationType } from '../../generated/prisma/enums';

export class NotificationResponseDto {
  id: string;
  auctionId: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
}

export class ListNotificationsResponseDto {
  items: NotificationResponseDto[];
  nextCursor: string | null;
}
