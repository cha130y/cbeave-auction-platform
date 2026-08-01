'use client';

import {
  createAdminCategory,
  listAdminCategories,
  setAdminCategoryActivation,
  updateAdminCategory,
} from '@/features/admin/categories/api/admin-categories.api';
import { categoryQueryKey } from '@/features/categories/queries/category.queries';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const adminCategoryQueryKeys = {
  all: ['admin', 'categories'] as const,

  list: () => [...adminCategoryQueryKeys.all, 'list'] as const,
};

export function useAdminCategories(enabled = true) {
  return useQuery({
    queryKey: adminCategoryQueryKeys.list(),
    queryFn: listAdminCategories,
    //enabled parameter lets the screen prevent the protected request until the authenticated user is confirmed to be an administrator

    enabled,
  });
}

export function useCreateAdminCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAdminCategory,

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adminCategoryQueryKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: categoryQueryKey,
        }),
      ]);
    },
  });
}

export function useUpdateAdminCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAdminCategory,

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adminCategoryQueryKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: categoryQueryKey,
        }),
      ]);
    },
  });
}

export function useSetAdminCategoryActivation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setAdminCategoryActivation,

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adminCategoryQueryKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: categoryQueryKey,
        }),
      ]);
    },
  });
}
