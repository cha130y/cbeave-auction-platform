import { UserRole } from '../../generated/prisma/enums';

export type RotateUserSessionResult = {
  sessionId: string;
  userId: string;
  userRole: UserRole;
  refreshToken: string;
  expiresAt: Date;
};
