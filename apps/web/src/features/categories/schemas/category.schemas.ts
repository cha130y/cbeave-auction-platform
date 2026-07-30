import z from 'zod';

const uuidV4Schema = z.uuid({ version: 'v4' });

export const categoryChildSchema = z.object({
  id: uuidV4Schema,
  parentId: uuidV4Schema.nullable(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable(),
});

//.extend() creates a new schema by copying an existing schema and adding more fields.
export const categorySchema = categoryChildSchema.extend({
  children: z.array(categoryChildSchema),
});

export const categoryListSchema = z.array(categorySchema);

export type CategoryChild = z.infer<typeof categoryChildSchema>;

export type Category = z.infer<typeof categorySchema>;
