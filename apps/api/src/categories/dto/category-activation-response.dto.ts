export class CategoryActivationResponseDto {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  isActive: boolean;
  updatedAt: Date;
}
