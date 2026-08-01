'use client';

import {
  adminCategoryActivationResponseSchema,
  adminCategoryListSchema,
  type AdminCategory,
  type AdminCategoryActivationResponse,
  type CreateAdminCategoryFormValues,
  type UpdateAdminCategoryFormValues,
} from '@/features/admin/categories/schemas/admin-category.schemas';
import {
  categorySchema,
  type Category,
} from '@/features/categories/schemas/category.schemas';
import { apiRequest } from '@/lib/api/api-client';

export type UpdateAdminCategoryParams = UpdateAdminCategoryFormValues & {
  categoryId: string;
};

export type SetAdminCategoryActivationParams = {
  categoryId: string;
  isActive: boolean;
};

//Using unknown ensures the server response cannot be treated as trusted category data until Zod validates it.
//TypeScript provides compile-time safety, while Zod provides runtime safety.
export async function listAdminCategories(): Promise<AdminCategory[]> {
  return adminCategoryListSchema.parse(
    await apiRequest<unknown>('/categories/admin'),
  );
}

export async function createAdminCategory(
  input: CreateAdminCategoryFormValues,
): Promise<Category> {
  return categorySchema.parse(
    await apiRequest<unknown>('/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        //backend define description?: string;
        ...(input.description ? { description: input.description } : {}),
        ...(input.parentId ? { parentId: input.parentId } : {}),
      }),
    }),
  );
}

export async function updateAdminCategory(
  input: UpdateAdminCategoryParams,
): Promise<Category> {
  return categorySchema.parse(
    await apiRequest<unknown>(
      `/categories/${encodeURIComponent(input.categoryId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: input.name,
          //backend define description?: string | null;
          //undefined → do not change the description
          // string → replace the description
          // null → clear the description
          description: input.description || null,
        }),
      },
    ),
  );
}

export async function setAdminCategoryActivation(
  input: SetAdminCategoryActivationParams,
): Promise<AdminCategoryActivationResponse> {
  const action = input.isActive ? 'activate' : 'deactivate';

  return adminCategoryActivationResponseSchema.parse(
    await apiRequest<unknown>(
      `/categories/${encodeURIComponent(input.categoryId)}/${action}`,
      {
        method: 'PATCH',
      },
    ),
  );
}
