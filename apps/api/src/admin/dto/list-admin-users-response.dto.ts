import { UserRole, UserStatus } from '../../generated/prisma/enums';

export class AdminUserProfileSummaryDto {
  firstName: string;
  lastName: string | null;
  displayName: string;
  avatarUrl: string | null;
}

export class AdminUserSummaryResponseDto {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  profile: AdminUserProfileSummaryDto | null;
}

export class ListAdminUsersResponseDto {
  items: AdminUserSummaryResponseDto[];
  nextCursor: string | null;
}
