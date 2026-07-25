export type CreateCategoryInput = {
  adminUserId: string;
  name: string;
  description?: string;
  parentId?: string;
};
