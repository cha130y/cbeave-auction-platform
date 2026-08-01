import { publicAuctionCategorySchema } from '@/features/auctions/schemas/auction.schemas';
import z from 'zod';

const uuidV4Schema = z.uuid({ version: 'v4' });

const moneyInputSchema = z
  .string()
  .trim()
  .regex(
    /^(?:0\.(?:0[1-9]|[1-9]\d?)|[1-9]\d{0,15}(?:\.\d{1,2})?)$/,
    'Enter a positive amount with at most 2 decimal places',
  );

const moneyResponseSchema = z.string().regex(/^\d+\.\d{2}$/);
const dateTimeSchema = z.iso.datetime();

export const auctionDraftFormSchema = z
  .object({
    categoryId: uuidV4Schema,

    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(180, 'Title is too long'),

    description: z
      .string()
      .trim()
      .min(1, 'Description is required')
      .max(5000, 'Description is too long'),

    startingPrice: moneyInputSchema,
    // z.union mean the value must be either A or B
    reservePrice: z.union([moneyInputSchema, z.literal('')]),
    minBidIncrement: moneyInputSchema,
    scheduledStartAt: z.string(),

    scheduledEndAt: z.string(),
  })
  //superRefine handles validation involving two fields
  .superRefine((values, context) => {
    const hasStart = values.scheduledStartAt.length > 0;
    const hasEnd = values.scheduledEndAt.length > 0;

    if (hasStart !== hasEnd) {
      context.addIssue({
        code: 'custom',
        message: 'Start and end times must be supplied together',
        path: [hasStart ? 'scheduledEndAt' : 'scheduledStartAt'],
      });
      return;
    }

    if (
      hasStart &&
      hasEnd &&
      new Date(values.scheduledEndAt).getTime() <=
        new Date(values.scheduledStartAt).getTime()
    ) {
      context.addIssue({
        code: 'custom',
        message: 'End time must be later than start time',
        path: ['scheduledEndAt'],
      });
    }
    if (
      values.reservePrice &&
      Number(values.reservePrice) < Number(values.startingPrice)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Reserve price cannot be lower than starting price',
        path: ['reservePrice'],
      });
    }
  });

export const auctionDraftImageSchema = z.object({
  id: uuidV4Schema,
  auctionId: uuidV4Schema,
  url: z.url(),
  altText: z.string().nullable(),
  position: z.number().int().nonnegative(),
  isPrimary: z.boolean(),
  createdAt: dateTimeSchema,
});

export const auctionDraftResponseSchema = z.object({
  id: uuidV4Schema,
  sellerId: uuidV4Schema,
  categoryId: uuidV4Schema,
  title: z.string().min(1),
  description: z.string().min(1),
  status: z.literal('DRAFT'),
  currency: z.string().regex(/^[A-Z]{3}$/),
  startingPrice: moneyResponseSchema,
  reservePrice: moneyResponseSchema.nullable(),
  minBidIncrement: moneyResponseSchema,
  currentPrice: moneyResponseSchema,
  scheduledStartAt: dateTimeSchema.nullable(),
  originalEndAt: dateTimeSchema.nullable(),
  currentEndAt: dateTimeSchema.nullable(),
  rowVersion: z.number().int().positive(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  images: z.array(auctionDraftImageSchema),
  category: publicAuctionCategorySchema,
});

export const publishAuctionResponseSchema = z.object({
  id: uuidV4Schema,
  status: z.enum(['SCHEDULED', 'ACTIVE']),
  scheduledStartAt: dateTimeSchema,
  currentEndAt: dateTimeSchema,
  publishedAt: dateTimeSchema,
  startedAt: dateTimeSchema.nullable(),
  rowVersion: z.number().int().positive(),
});

export const ownedAuctionStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'SOLD',
  'UNSOLD',
  'CANCELLED',
]);

export const ownedAuctionSummarySchema = z.object({
  id: uuidV4Schema,
  title: z.string().min(1),
  status: ownedAuctionStatusSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  currentPrice: moneyResponseSchema,
  bidCount: z.number().int().nonnegative(),
  scheduledStartAt: dateTimeSchema.nullable(),
  currentEndAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  primaryImage: z
    .object({
      url: z.url(),
      altText: z.string().nullable(),
    })
    .nullable(),
  category: publicAuctionCategorySchema,
});

export const listOwnedAuctionsResponseSchema = z.object({
  items: z.array(ownedAuctionSummarySchema),
  nextCursor: uuidV4Schema.nullable(),
});

export type AuctionDraftFormValues = z.infer<typeof auctionDraftFormSchema>;
export type AuctionDraft = z.infer<typeof auctionDraftResponseSchema>;
export type AuctionDraftImage = z.infer<typeof auctionDraftImageSchema>;
export type PublishedAuction = z.infer<typeof publishAuctionResponseSchema>;
export type OwnedAuctionStatus = z.infer<typeof ownedAuctionStatusSchema>;

export type OwnedAuctionSummary = z.infer<typeof ownedAuctionSummarySchema>;

export type ListOwnedAuctionsResponse = z.infer<
  typeof listOwnedAuctionsResponseSchema
>;
