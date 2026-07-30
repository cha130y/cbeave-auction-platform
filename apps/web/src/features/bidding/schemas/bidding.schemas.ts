import { isMoneyAtLeast } from '@/lib/money';
import z from 'zod';

const uuidV4Schema = z.uuid({ version: 'v4' });
const dateTimeSchema = z.iso.datetime();
const moneyResponseSchema = z.string().regex(/^\d+\.\d{2}$/);

const moneyInputPattern =
  /^(?:0\.(?:0[1-9]|[1-9]\d?)|[1-9]\d{0,15}(?:\.\d{1,2})?)$/;

const moneyInputSchema = z.string().trim().regex(moneyInputPattern, {
  message: 'Enter a positive amount with at most 2 decimal places',
});

export function createPlaceBidFormSchema(minimumBid: string) {
  return z.object({
    amount: moneyInputSchema.refine(
      (amount) =>
        !moneyInputPattern.test(amount) || isMoneyAtLeast(amount, minimumBid),
      {
        message: `Bid must be at least ${minimumBid}`,
      },
    ),
  });
}

export const publicBidSchema = z.object({
  sequenceNo: z.number().int().positive(),
  amount: moneyResponseSchema,
  placedAt: dateTimeSchema,
  bidderDisplayName: z.string().min(1),
});

export const listPublicBidsResponseSchema = z.object({
  items: z.array(publicBidSchema),
  nextCursor: z.number().int().positive().nullable(),
});

export const bidExtensionSchema = z.object({
  extensionNumber: z.number().int().positive(),
  previousEndAt: dateTimeSchema,
  newEndAt: dateTimeSchema,
});

export const bidAcceptedEventSchema = z.object({
  auctionId: uuidV4Schema,
  amount: moneyResponseSchema,
  sequenceNo: z.number().int().positive(),
  placedAt: dateTimeSchema,
  currentPrice: moneyResponseSchema,
  bidCount: z.number().int().positive(),
  reserveMet: z.boolean(),
  currentEndAt: dateTimeSchema,
  extension: bidExtensionSchema.nullable(),
});

export const placeBidResponseSchema = z.object({
  id: uuidV4Schema,
  auctionId: uuidV4Schema,
  clientRequestId: uuidV4Schema,
  amount: moneyResponseSchema,
  sequenceNo: z.number().int().positive(),
  placedAt: dateTimeSchema,
  currentPrice: moneyResponseSchema,
  bidCount: z.number().int().positive(),
  reserveMet: z.boolean(),
  currentEndAt: dateTimeSchema,
  extension: bidExtensionSchema.nullable(),
});

export type PublicBid = z.infer<typeof publicBidSchema>;

export type ListPublicBidsResponse = z.infer<
  typeof listPublicBidsResponseSchema
>;

export type PlaceBidResponse = z.infer<typeof placeBidResponseSchema>;

export type PlaceBidFormValues = z.infer<
  ReturnType<typeof createPlaceBidFormSchema>
>;

export type BidAcceptedEvent = z.infer<typeof bidAcceptedEventSchema>;
