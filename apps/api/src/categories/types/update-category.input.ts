export type UpdateCategoryInput = {
  adminUserId: string;
  categoryId: string;
  name?: string;
  description?: string | null;
};
