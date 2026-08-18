import { publicAuctionSummarySchema } from '@/features/auctions/schemas/auction.schemas';
import { uuidV4Schema, dateTimeSchema } from '@/lib/schemas/primitives';
import z from 'zod';

export const watchlistEntryResponseSchema = z.object({
  auctionId: uuidV4Schema,
  watched: z.boolean(),
  createdAt: dateTimeSchema,
});

export const watchlistItemSchema = z.object({
  watchedAt: dateTimeSchema,
  auction: publicAuctionSummarySchema,
});

export const listWatchlistResponseSchema = z.object({
  items: z.array(watchlistItemSchema),
  nextCursor: uuidV4Schema.nullable(),
});

export type WatchlistEntry = z.infer<typeof watchlistEntryResponseSchema>;

export type WatchlistItem = z.infer<typeof watchlistItemSchema>;

export type ListWatchlistResponse = z.infer<typeof listWatchlistResponseSchema>;
