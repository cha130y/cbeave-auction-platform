'use client';

import { listActiveCategories } from '@/features/categories/api/categories.api';
import { useQuery } from '@tanstack/react-query';

export const categoryQueryKey = ['categories', 'active'] as const;

export function useActiveCategories() {
  return useQuery({
    queryKey: categoryQueryKey,
    queryFn: listActiveCategories,
  });
}
