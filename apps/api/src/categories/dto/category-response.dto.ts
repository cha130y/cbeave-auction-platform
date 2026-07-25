export class CategoryResponseDto {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  children: CategoryChildResponseDto[];
}

export class CategoryChildResponseDto {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
}
