import { UserRole } from '../../generated/prisma/enums';

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
  profile: {
    firstName: string;
    lastName: string | null;
    displayName: string;
    avatarUrl: string | null;
  } | null;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: AuthenticatedUser;
};
