import {
  ownedAuctionStatusSchema,
  cancelOwnedAuctionResponseSchema,
} from '@/features/auctions/schemas/auction-draft.schemas';
import { publicAuctionCategorySchema } from '@/features/auctions/schemas/auction.schemas';
import { assetUrlSchema } from '@/lib/schemas/asset-url.schema';
import {
  uuidV4Schema,
  dateTimeSchema,
  moneyResponseSchema as moneySchema,
  currencyCodeSchema,
} from '@/lib/schemas/primitives';
import { z } from 'zod';

const adminAuctionSellerSchema = z.object({
  id: uuidV4Schema,
  email: z.email(),
  displayName: z.string().min(1),
});

const adminAuctionPrimaryImageSchema = z.object({
  url: assetUrlSchema,
  altText: z.string().nullable(),
});

export const adminAuctionSchema = z.object({
  id: uuidV4Schema,
  title: z.string().min(1),
  status: ownedAuctionStatusSchema,
  currency: currencyCodeSchema,
  currentPrice: moneySchema,
  bidCount: z.number().int().nonnegative(),
  scheduledStartAt: dateTimeSchema.nullable(),
  currentEndAt: dateTimeSchema.nullable(),
  publishedAt: dateTimeSchema.nullable(),
  endedAt: dateTimeSchema.nullable(),
  cancellationReason: z.string().nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  primaryImage: adminAuctionPrimaryImageSchema.nullable(),
  category: publicAuctionCategorySchema,
  seller: adminAuctionSellerSchema,
});

export const listAdminAuctionsResponseSchema = z.object({
  items: z.array(adminAuctionSchema),
  nextCursor: uuidV4Schema.nullable(),
});

export const cancelAdminAuctionFormSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Enter at least 3 characters')
    .max(500, 'Use at most 500 characters'),
});

export const cancelAdminAuctionResponseSchema =
  cancelOwnedAuctionResponseSchema;

export type AdminAuction = z.infer<typeof adminAuctionSchema>;

export type AdminAuctionStatus = z.infer<typeof ownedAuctionStatusSchema>;

export type ListAdminAuctionsResponse = z.infer<
  typeof listAdminAuctionsResponseSchema
>;

export type CancelAdminAuctionFormValues = z.infer<
  typeof cancelAdminAuctionFormSchema
>;

export type CancelAdminAuctionResponse = z.infer<
  typeof cancelAdminAuctionResponseSchema
>;
