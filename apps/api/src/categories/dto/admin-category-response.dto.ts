export class AdminCategoryChildResponseDto {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class AdminCategoryResponseDto {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  children: AdminCategoryChildResponseDto[];
}
