import { UserStatus } from '../../generated/prisma/enums';

export type ListAdminUsersInput = {
  cursor?: string;
  limit: number;
  status?: UserStatus;
};
