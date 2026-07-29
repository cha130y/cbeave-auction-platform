import z from 'zod';

const uuidV4Schema = z.uuid({ version: 'v4' });
const dateTimeSchema = z.iso.datetime();
const moneySchema = z.string().regex(/^\d+\.\d{2}$/, {
  message: 'Expected a monetary value with two decimal places',
});

export const publicAuctionStatusSchema = z.enum([
  'SCHEDULED',
  'ACTIVE',
  'SOLD',
  'UNSOLD',
]);

export const publicAuctionImageSchema = z.object({
  url: z.url(),
  altText: z.string().nullable(),
});

export const publicAuctionCategorySchema = z.object({
  id: uuidV4Schema,
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const publicAuctionSellerSchema = z.object({
  id: uuidV4Schema,
  displayName: z.string().min(1),
  avatarUrl: z.url().nullable(),
});

export const publicAuctionSummarySchema = z.object({
  id: uuidV4Schema,
  title: z.string().min(1),
  status: publicAuctionStatusSchema,
  currency: z.string().regex(/^[A-Z]{3}$/, {
    message: 'Expected a three-letter currency code',
  }),
  startingPrice: moneySchema,
  currentPrice: moneySchema,
  bidCount: z.number().int().nonnegative(),
  reserveMet: z.boolean(),
  scheduledStartAt: dateTimeSchema,
  currentEndAt: dateTimeSchema,
  publishedAt: dateTimeSchema,
  primaryImage: publicAuctionImageSchema,
  category: publicAuctionCategorySchema,
  seller: publicAuctionSellerSchema,
});

export const listPublicAuctionsResponseSchema = z.object({
  items: z.array(publicAuctionSummarySchema),
  nextCursor: uuidV4Schema.nullable(),
});

export const listHotAuctionsResponseSchema = z.object({
  items: z.array(publicAuctionSummarySchema),
});

export const publicAuctionDetailImageSchema = z.object({
  id: uuidV4Schema,
  url: z.url(),
  altText: z.string().nullable(),
  position: z.number().int().nonnegative(),
  isPrimary: z.boolean(),
});

export const publicAuctionWinnerSchema = z.object({
  id: uuidV4Schema,
  displayName: z.string().min(1),
  avatarUrl: z.url().nullable(),
});

export const publicAuctionDetailSchema = z.object({
  id: uuidV4Schema,
  title: z.string().min(1),
  description: z.string().min(1),
  status: publicAuctionStatusSchema,
  currency: z.string().regex(/^[A-Z]{3}$/, {
    message: 'Expected a three-letter currency code',
  }),
  startingPrice: moneySchema,
  currentPrice: moneySchema,
  minBidIncrement: moneySchema,
  bidCount: z.number().int().nonnegative(),
  reserveMet: z.boolean(),
  scheduledStartAt: dateTimeSchema,
  originalEndAt: dateTimeSchema,
  currentEndAt: dateTimeSchema,
  publishedAt: dateTimeSchema,
  startedAt: dateTimeSchema.nullable(),
  endedAt: dateTimeSchema.nullable(),
  extensionCount: z.number().int().nonnegative(),
  soldPrice: moneySchema.nullable(),
  images: z.array(publicAuctionDetailImageSchema).min(1),
  category: publicAuctionCategorySchema,
  seller: publicAuctionSellerSchema,
  winner: publicAuctionWinnerSchema.nullable(),
});

export type PublicAuctionStatus = z.infer<typeof publicAuctionStatusSchema>;

export type PublicAuctionSummary = z.infer<typeof publicAuctionSummarySchema>;

export type ListPublicAuctionsResponse = z.infer<
  typeof listPublicAuctionsResponseSchema
>;

export type ListHotAuctionsResponse = z.infer<
  typeof listHotAuctionsResponseSchema
>;

export type PublicAuctionDetail = z.infer<typeof publicAuctionDetailSchema>;
