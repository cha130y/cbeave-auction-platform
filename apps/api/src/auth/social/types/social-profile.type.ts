import { AuthProvider } from '../../../generated/prisma/enums';

export interface SocialProfile {
  provider: AuthProvider;
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string | null;
  displayName: string;
  avatarUrl: string | null;
}
