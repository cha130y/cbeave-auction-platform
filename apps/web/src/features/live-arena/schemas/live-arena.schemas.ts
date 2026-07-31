import {
  moneyResponseSchema,
  publicBidSchema,
} from '@/features/bidding/schemas/bidding.schemas';
import z from 'zod';

const uuidV4Schema = z.uuid({
  version: 'v4',
});

const dateTimeSchema = z.iso.datetime();

export const auctionParticipationSchema = z.object({
  auctionId: uuidV4Schema,
  participantCount: z.number().int().nonnegative(),
});

export const auctionStartedEventSchema = z.object({
  auctionId: uuidV4Schema,
  status: z.literal('ACTIVE'),
  startedAt: dateTimeSchema,
  currentEndAt: dateTimeSchema,
});

export const auctionExtensionTriggerBidSchema = z.object({
  amount: moneyResponseSchema,
  sequenceNo: z.number().int().positive(),
  placedAt: dateTimeSchema,
});

export const auctionExtendedEventSchema = z.object({
  auctionId: uuidV4Schema,
  extensionNumber: z.number().int().positive(),
  previousEndAt: dateTimeSchema,
  newEndAt: dateTimeSchema,
  extensionSeconds: z.number().int().positive(),
  triggeringBid: auctionExtensionTriggerBidSchema,
});

export const activeArenaLeaderSchema = z.object({
  bidderDisplayName: z.string().min(1),
  amount: moneyResponseSchema,
});

export const activeArenaStateSchema = z.object({
  auctionId: uuidV4Schema,
  title: z.string().min(1),
  status: z.literal('ACTIVE'),
  currency: z.string().regex(/^[A-Z]{3}$/),
  currentPrice: moneyResponseSchema,
  minimumNextBid: moneyResponseSchema,
  bidCount: z.number().int().nonnegative(),
  reserveMet: z.boolean(),
  startedAt: dateTimeSchema,
  currentEndAt: dateTimeSchema,
  extensionCount: z.number().int().nonnegative(),
  participantCount: z.number().int().nonnegative(),
  canBid: z.boolean(),
  leader: activeArenaLeaderSchema.nullable(),
  recentBids: z.array(publicBidSchema),
});

export type AuctionParticipation = z.infer<typeof auctionParticipationSchema>;

export type AuctionStartedEvent = z.infer<typeof auctionStartedEventSchema>;

export type ActiveArenaState = z.infer<typeof activeArenaStateSchema>;

export type AuctionExtendedEvent = z.infer<typeof auctionExtendedEventSchema>;
