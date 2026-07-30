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

export type AuctionParticipation = z.infer<typeof auctionParticipationSchema>;

export type AuctionStartedEvent = z.infer<typeof auctionStartedEventSchema>;
