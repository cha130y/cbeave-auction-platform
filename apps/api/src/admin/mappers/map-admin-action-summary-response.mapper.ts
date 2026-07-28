import { AdminActionResponseDto } from '../dto/list-admin-actions-response.dto';
import { AdminActionSummaryRecord } from '../queries/admin-action-summary.select';

export function mapAdminActionSummaryResponse(
  action: AdminActionSummaryRecord,
): AdminActionResponseDto {
  return {
    id: action.id,
    actionType: action.actionType,
    note: action.note,
    createdAt: action.createdAt,
    adminUser: {
      id: action.adminUser.id,
      email: action.adminUser.email,
      displayName: action.adminUser.userProfile?.displayName ?? null,
    },
    targetUser: action.targetUser
      ? {
          id: action.targetUser.id,
          email: action.targetUser.email,
          displayName: action.targetUser.userProfile?.displayName ?? null,
        }
      : null,
    auction: action.auction
      ? {
          id: action.auction.id,
          title: action.auction.title,
          status: action.auction.status,
        }
      : null,
    category: action.category
      ? {
          id: action.category.id,
          name: action.category.name,
        }
      : null,
  };
}
