import { UserRole, UserStatus } from '../../generated/prisma/enums';

export class CurrentUserProfileResponseDto {
  firstName: string;
  lastName: string | null;
  fullName: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CurrentUserResponseDto {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  profile: CurrentUserProfileResponseDto | null;
}
