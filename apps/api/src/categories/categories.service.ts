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

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

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
}
