import z from 'zod';

export const profileFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name is too long'),

  lastName: z.string().trim().max(100, 'Last name is too long'),

  displayName: z
    .string()
    .trim()
    .min(1, 'Display name is required')
    .max(80, 'Display name is too long'),

  bio: z.string().trim().max(500, 'Bio is too long'),

  phone: z.string().trim().max(40, 'Phone number is too long'),

  location: z.string().trim().max(100, 'Location is too long'),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export type UpdateProfileInput = {
  firstName: string;
  lastName: string | null;
  displayName: string;
  bio: string | null;
  phone: string | null;
  location: string | null;
};
