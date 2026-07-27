import { Prisma } from '../../generated/prisma/client';

export const adminUserSummarySelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  userProfile: {
    select: {
      firstName: true,
      lastName: true,
      displayName: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.UserSelect;

export type AdminUserSummaryRecord = Prisma.UserGetPayload<{
  select: typeof adminUserSummarySelect;
}>;
