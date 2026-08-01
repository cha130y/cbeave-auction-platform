import { ownedAuctionStatusSchema } from '@/features/auctions/schemas/auction-draft.schemas';
import z from 'zod';

const uuidV4Schema = z.uuid({ version: 'v4' });
const dateTimeSchema = z.iso.datetime();

export const adminActionTypes = [
  'SUSPEND_USER',
  'REACTIVATE_USER',
  'CREATE_CATEGORY',
  'UPDATE_CATEGORY',
  'ACTIVATE_CATEGORY',
  'DEACTIVATE_CATEGORY',
  'CANCEL_AUCTION',
] as const;

export const adminActionTypeSchema = z.enum(adminActionTypes);

const adminActionUserSchema = z.object({
  id: uuidV4Schema,
  email: z.email(),
  displayName: z.string().nullable(),
});

const adminActionAuctionSchema = z.object({
  id: uuidV4Schema,
  title: z.string().min(1),
  status: ownedAuctionStatusSchema,
});

const adminActionCategorySchema = z.object({
  id: uuidV4Schema,
  name: z.string().min(1),
});

export const adminActionSchema = z.object({
  id: uuidV4Schema,
  actionType: adminActionTypeSchema,
  note: z.string().nullable(),
  createdAt: dateTimeSchema,
  adminUser: adminActionUserSchema,
  targetUser: adminActionUserSchema.nullable(),
  auction: adminActionAuctionSchema.nullable(),
  category: adminActionCategorySchema.nullable(),
});

export const listAdminActionsResponseSchema = z.object({
  items: z.array(adminActionSchema),
  nextCursor: uuidV4Schema.nullable(),
});

export type AdminActionType = z.infer<typeof adminActionTypeSchema>;
export type AdminAction = z.infer<typeof adminActionSchema>;
export type ListAdminActionsResponse = z.infer<
  typeof listAdminActionsResponseSchema
>;
