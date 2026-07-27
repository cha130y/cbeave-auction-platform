import { AdminUserSummaryResponseDto } from '../dto/list-admin-users-response.dto';
import { AdminUserSummaryRecord } from '../queries/admin-user-summary.select';

export function mapAdminUserSummaryResponse(
  user: AdminUserSummaryRecord,
): AdminUserSummaryResponseDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: user.userProfile,
  };
}
