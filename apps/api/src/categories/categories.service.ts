import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CreateCategoryInput } from './types/create-category.input';
import { createCategorySlug } from './utils/create-category-slug.util';
import { AdminActionType } from '../generated/prisma/enums';
import { PrismaClientKnownRequestError } from '../generated/prisma/internal/prismaNamespace';
import { UpdateCategoryInput } from './types/update-category.input';
import { SetCategoryActivationInput } from './types/set-category-activation.input';
import { CategoryActivationResponseDto } from './dto/category-activation-response.dto';
import { AdminCategoryResponseDto } from './dto/admin-category-response.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  //use for public
  async findActiveTree(): Promise<CategoryResponseDto[]> {
    return this.prisma.category.findMany({
      where: {
        parentId: null, //root category
        isActive: true,
      },
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        description: true,
        children: {
          //children Category[] @relation("CategoryHierarchy")
          where: {
            isActive: true,
          },
          select: {
            id: true,
            parentId: true,
            name: true,
            slug: true,
            description: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  //complete administrator response
  async findAdminTree(): Promise<AdminCategoryResponseDto[]> {
    return this.prisma.category.findMany({
      where: {
        parentId: null,
      },
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        children: {
          select: {
            id: true,
            parentId: true,
            name: true,
            slug: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async createCategory(
    input: CreateCategoryInput,
  ): Promise<CategoryResponseDto> {
    const slug = createCategorySlug(input.name);

    if (!slug) {
      throw new BadRequestException(
        'Category name must contain at least one letter or number',
      );
    }
    try {
      return await this.prisma.$transaction(async (transaction) => {
        if (input.parentId) {
          const parent = await transaction.category.findUnique({
            where: {
              id: input.parentId,
            },
            select: {
              parentId: true,
              isActive: true,
            },
          });

          if (!parent) {
            throw new NotFoundException('Parent category not found');
          }

          if (parent.parentId !== null) {
            throw new BadRequestException(
              'Category hierarchy supports only two levels',
            );
          }

          if (!parent.isActive) {
            throw new BadRequestException('Parent category must be active');
          }
        }
        const category = await transaction.category.create({
          data: {
            name: input.name,
            slug,
            description: input.description ?? null,
            parentId: input.parentId ?? null,
            createdByAdminId: input.adminUserId,
          },
          select: {
            id: true,
            parentId: true,
            name: true,
            slug: true,
            description: true,
          },
        });

        await transaction.adminAction.create({
          data: {
            adminUserId: input.adminUserId,
            categoryId: category.id,
            actionType: AdminActionType.CREATE_CATEGORY,
            note: `Create category "${category.name}"`,
          },
        });
        return {
          ...category,
          children: [], //create new category(no loaded children)
        };
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A category with this name or slug already exists',
        );
      }
      throw error;
    }
  }

  async updateCategory(
    input: UpdateCategoryInput,
  ): Promise<CategoryResponseDto> {
    const hasUpdate =
      input.name !== undefined || input.description !== undefined;

    if (!hasUpdate) {
      throw new BadRequestException('At least one category field is required');
    }

    return this.prisma.$transaction(async (transaction) => {
      const existingCategory = await transaction.category.findUnique({
        where: {
          id: input.categoryId,
        },
        select: {
          id: true,
        },
      });

      if (!existingCategory) {
        throw new NotFoundException('Category not found');
      }

      const category = await transaction.category.update({
        where: {
          id: input.categoryId,
        },
        data: {
          //update only supplied fields, if field is null ==> clear exists field
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
        },
        select: {
          // root category
          id: true,
          parentId: true,
          name: true,
          slug: true,
          description: true,
          children: {
            where: {
              isActive: true,
            },
            select: {
              // children category
              id: true,
              parentId: true,
              name: true,
              slug: true,
              description: true,
            },
            orderBy: {
              name: 'asc',
            },
          },
        },
      });

      const updatedFields = [
        input.name !== undefined ? 'name' : null,
        input.description !== undefined ? 'description' : null,
      ]
        .filter((field): field is string => field !== null)
        .join(', ');

      await transaction.adminAction.create({
        data: {
          adminUserId: input.adminUserId,
          categoryId: category.id,
          actionType: AdminActionType.UPDATE_CATEGORY,
          note: `Updated category "${category.name}": ${updatedFields}`,
        },
      });

      return category;
    });
  }

  async setCategoryActivation(
    input: SetCategoryActivationInput,
  ): Promise<CategoryActivationResponseDto> {
    return this.prisma.$transaction(async (transaction) => {
      const category = await transaction.category.findUnique({
        where: {
          id: input.categoryId,
        },
        select: {
          id: true,
          parentId: true,
          name: true,
          slug: true,
          isActive: true,
          updatedAt: true,
          parent: {
            select: {
              isActive: true,
            },
          },
        },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      if (
        input.isActive &&
        category.parentId !== null &&
        !category.parent?.isActive
      ) {
        throw new BadRequestException(
          'Parent category must be active before activating this category',
        );
      }

      if (category.isActive === input.isActive) {
        return {
          id: category.id,
          parentId: category.parentId,
          name: category.name,
          slug: category.slug,
          isActive: category.isActive,
          updatedAt: category.updatedAt,
        };
      }

      const updatedCategory = await transaction.category.update({
        where: {
          id: category.id,
        },
        data: {
          isActive: input.isActive,
        },
        select: {
          id: true,
          parentId: true,
          name: true,
          slug: true,
          isActive: true,
          updatedAt: true,
        },
      });

      const actionType = input.isActive
        ? AdminActionType.ACTIVATE_CATEGORY
        : AdminActionType.DEACTIVATE_CATEGORY;

      const actionVerb = input.isActive ? 'Activated' : 'Deactivated';

      await transaction.adminAction.create({
        data: {
          adminUserId: input.adminUserId,
          categoryId: updatedCategory.id,
          actionType,
          note: `${actionVerb} category "${updatedCategory.name}"`,
        },
      });

      return updatedCategory;
    });
  }
}
