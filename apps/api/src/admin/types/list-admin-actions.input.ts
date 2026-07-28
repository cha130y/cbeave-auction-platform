import { AdminActionType } from '../../generated/prisma/enums';

export type ListAdminActionsInput = {
  cursor?: string;
  limit: number;
  actionType?: AdminActionType;
};
