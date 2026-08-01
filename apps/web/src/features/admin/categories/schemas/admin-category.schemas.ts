import { z } from 'zod';

const uuidV4Schema = z.uuid({ version: 'v4' });
const dateTimeSchema = z.iso.datetime();

const categoryNameSchema = z
  .string()
  .trim()
  .min(1, 'Category name is required')
  .max(120, 'Use at most 120 characters');

const categoryDescriptionSchema = z
  .string()
  .trim()
  .max(500, 'Use at most 500 characters');

export const adminCategoryChildSchema = z.object({
  id: uuidV4Schema,
  parentId: uuidV4Schema.nullable(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

//extend() avoids repeating the shared fields
export const adminCategorySchema = adminCategoryChildSchema.extend({
  //children must be an array, and every item in that array must match adminCategoryChildSchema , accept children : []
  children: z.array(adminCategoryChildSchema),
});

export const adminCategoryListSchema = z.array(adminCategorySchema);

export const adminCategoryActivationResponseSchema = z.object({
  id: uuidV4Schema,
  parentId: uuidV4Schema.nullable(),
  name: z.string().min(1),
  slug: z.string().min(1),
  isActive: z.boolean(),
  updatedAt: dateTimeSchema,
});

export const createAdminCategoryFormSchema = z.object({
  name: categoryNameSchema,
  description: categoryDescriptionSchema,
  parentId: z.union([uuidV4Schema, z.literal('')]),
});

export const updateAdminCategoryFormSchema = z.object({
  name: categoryNameSchema,
  description: categoryDescriptionSchema,
});

export type AdminCategoryChild = z.infer<typeof adminCategoryChildSchema>;

export type AdminCategory = z.infer<typeof adminCategorySchema>;

export type CreateAdminCategoryFormValues = z.infer<
  typeof createAdminCategoryFormSchema
>;

export type UpdateAdminCategoryFormValues = z.infer<
  typeof updateAdminCategoryFormSchema
>;

export type AdminCategoryActivationResponse = z.infer<
  typeof adminCategoryActivationResponseSchema
>;
