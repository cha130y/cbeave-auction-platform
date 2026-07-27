import { UserStatus } from '../../generated/prisma/enums';

export type ChangeUserStatusInput = {
  adminUserId: string;
  targetUserId: string;
  targetStatus: UserStatus;
  note: string;
};
