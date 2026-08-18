import {
  userRoleSchema,
  userStatusSchema,
} from '@/features/auth/schemas/auth.schemas';
import { uuidV4Schema, dateTimeSchema } from '@/lib/schemas/primitives';
import { z } from 'zod';

export const adminUserProfileSchema = z.object({
  firstName: z.string(),
  lastName: z.string().nullable(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
});

export const adminUserSchema = z.object({
  id: uuidV4Schema,
  email: z.email(),
  role: userRoleSchema,
  status: userStatusSchema,
  emailVerifiedAt: dateTimeSchema.nullable(),
  lastLoginAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  profile: adminUserProfileSchema.nullable(),
});

export const listAdminUsersResponseSchema = z.object({
  items: z.array(adminUserSchema),
  nextCursor: uuidV4Schema.nullable(),
});

export const changeUserStatusSchema = z.object({
  note: z
    .string()
    .trim()
    .min(3, 'Enter at least 3 characters')
    .max(500, 'Note must be 500 characters or fewer'),
});

export type AdminUser = z.infer<typeof adminUserSchema>;
export type AdminUserStatus = z.infer<typeof userStatusSchema>;
export type ChangeUserStatusInput = z.infer<typeof changeUserStatusSchema>;
export type ListAdminUsersResponse = z.infer<
  typeof listAdminUsersResponseSchema
>;
