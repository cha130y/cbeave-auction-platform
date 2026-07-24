import { AuthProvider } from '../../generated/prisma/enums';

export type ResolveSocialUserInput = {
  provider: AuthProvider;
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string | null;
  displayName: string;
  avatarUrl: string | null;
};

//SocialProfile: output from an OAuth provider adapter.
//ResolveSocialUserInput: input accepted by the database/user layer.
//This avoids making UsersService depend directly on files inside auth/social.
