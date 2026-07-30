import {
  Category,
  categoryListSchema,
} from '@/features/categories/schemas/category.schemas';
import { apiRequest } from '@/lib/api/api-client';

export async function listActiveCategories(): Promise<Category[]> {
  return categoryListSchema.parse(await apiRequest<unknown>('/categories'));
}
