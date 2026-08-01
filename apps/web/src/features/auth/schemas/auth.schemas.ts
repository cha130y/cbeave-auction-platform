import { z } from 'zod';

export const userRoleSchema = z.enum(['USER', 'ADMIN']);
export const userStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']);

const nullableDateTimeSchema = z.string().datetime().nullable();

export const currentUserProfileSchema = z.object({
  firstName: z.string(),
  lastName: z.string().nullable(),
  fullName: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const currentUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: userRoleSchema,
  status: userStatusSchema,
  emailVerifiedAt: nullableDateTimeSchema,
  lastLoginAt: nullableDateTimeSchema,
  createdAt: z.string().datetime(),
  profile: currentUserProfileSchema.nullable(),
});

export const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
});

export const messageResponseSchema = z.object({
  message: z.string().min(1),
});

export const loginCredentialsSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required').max(72),
  // rememberMe: z.boolean().optional(),
});

export const registerCredentialsSchema = z
  .object({
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
    email: z.string().trim().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters')
      .max(72, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type CurrentUser = z.infer<typeof currentUserSchema>;

export type LoginCredentials = Pick<
  z.infer<typeof loginCredentialsSchema>,
  'email' | 'password'
>;

export type LoginFormValues = z.infer<typeof loginCredentialsSchema>;
export type RegisterFormValues = z.infer<typeof registerCredentialsSchema>;

export type RegisterCredentials = {
  firstName: string;
  lastName?: string;
  displayName: string;
  email: string;
  password: string;
};
