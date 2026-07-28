import { UserRole } from '../../generated/prisma/enums';

export type GetActiveArenaStateInput = {
  auctionId: string;
  userId: string;
  userRole: UserRole;
};
