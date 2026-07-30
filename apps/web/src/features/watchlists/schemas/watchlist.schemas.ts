import { publicAuctionSummarySchema } from '@/features/auctions/schemas/auction.schemas';
import z from 'zod';

const uuidV4Schema = z.uuid({ version: 'v4' });
const dateTimeSchema = z.iso.datetime();

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
