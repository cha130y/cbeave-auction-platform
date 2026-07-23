import { UserRole } from '../../generated/prisma/enums';

export type AccessTokenPayload = {
  sub: string;
  role: UserRole;
  sid: string; //sid: database session ID, useful for logout and session revocation
};
