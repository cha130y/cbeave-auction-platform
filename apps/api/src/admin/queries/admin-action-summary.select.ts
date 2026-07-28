import { Prisma } from '../../generated/prisma/client';

export const adminActionSummarySelect = {
  id: true,
  actionType: true,
  note: true,
  createdAt: true,
  adminUser: {
    select: {
      id: true,
      email: true,
      userProfile: {
        select: {
          displayName: true,
        },
      },
    },
  },
  targetUser: {
    select: {
      id: true,
      email: true,
      userProfile: {
        select: {
          displayName: true,
        },
      },
    },
  },
  auction: {
    select: {
      id: true,
      title: true,
      status: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.AdminActionSelect;

export type AdminActionSummaryRecord = Prisma.AdminActionGetPayload<{
  select: typeof adminActionSummarySelect;
}>;
