import { uuidV4Schema, dateTimeSchema } from '@/lib/schemas/primitives';
import z from 'zod';

export const notificationTypeSchema = z.enum([
  'OUTBID',
  'AUCTION_WON',
  'AUCTION_ENDED',
  'AUCTION_CANCELLED',
]);

export const notificationSchema = z.object({
  id: uuidV4Schema,
  auctionId: uuidV4Schema,
  type: notificationTypeSchema,
  title: z.string().min(1),
  message: z.string().min(1),
  readAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
});

export const listNotificationsResponseSchema = z.object({
  items: z.array(notificationSchema),
  nextCursor: uuidV4Schema.nullable(),
});

export type Notification = z.infer<typeof notificationSchema>;

export type NotificationType = z.infer<typeof notificationTypeSchema>;

export type ListNotificationsResponse = z.infer<
  typeof listNotificationsResponseSchema
>;
