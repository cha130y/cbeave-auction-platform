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
import { createQueryString } from '@/lib/api/query-string';

export type ListAdminUsersParams = {
  cursor?: string;
  limit?: number;
  status?: AdminUserStatus;
};

export type ChangeAdminUserStatusParams = ChangeUserStatusInput & {
  userId: string;
};

export async function listAdminUsers(
  params: ListAdminUsersParams = {},
): Promise<ListAdminUsersResponse> {
  return listAdminUsersResponseSchema.parse(
    await apiRequest<unknown>(`/admin/users${createQueryString(params)}`),
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
