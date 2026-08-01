'use client';

import {
  adminUserSchema,
  listAdminUsersResponseSchema,
  type AdminUser,
  type AdminUserStatus,
  type ChangeUserStatusInput,
  type ListAdminUsersResponse,
} from '@/features/admin/users/schemas/admin-user.schemas';
import { apiRequest } from '@/lib/api/api-client';

export type ListAdminUsersParams = {
  cursor?: string;
  limit?: number;
  status?: AdminUserStatus;
};

export type ChangeAdminUserStatusParams = ChangeUserStatusInput & {
  userId: string;
};

function createAdminUsersQueryString(params: ListAdminUsersParams): string {
  const searchParams = new URLSearchParams();

  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }

  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.status) {
    searchParams.set('status', params.status);
  }

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
}

export async function listAdminUsers(
  params: ListAdminUsersParams = {},
): Promise<ListAdminUsersResponse> {
  return listAdminUsersResponseSchema.parse(
    await apiRequest<unknown>(
      `/admin/users${createAdminUsersQueryString(params)}`,
    ),
  );
}

async function changeAdminUserStatus(
  action: 'reactivate' | 'suspend',
  input: ChangeAdminUserStatusParams,
): Promise<AdminUser> {
  return adminUserSchema.parse(
    await apiRequest<unknown>(
      `/admin/users/${encodeURIComponent(input.userId)}/${action}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ note: input.note }),
      },
    ),
  );
}

export function suspendAdminUser(
  input: ChangeAdminUserStatusParams,
): Promise<AdminUser> {
  return changeAdminUserStatus('suspend', input);
}

export function reactivateAdminUser(
  input: ChangeAdminUserStatusParams,
): Promise<AdminUser> {
  return changeAdminUserStatus('reactivate', input);
}
