import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { AdminActionType } from '../generated/prisma/enums';
import { PrismaClientKnownRequestError } from '../generated/prisma/internal/prismaNamespace';
import { CategoriesService } from './categories.service';

// expect.objectContaining is typed as any, which the lint rules reject once it
// is nested inside an object literal rather than passed as a whole argument.
const containing = (shape: Record<string, unknown>): unknown =>
  expect.objectContaining(shape);

const UPDATED_AT = new Date('2026-03-01T12:00:00.000Z');

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';
const PARENT_ID = '33333333-3333-4333-8333-333333333333';

const duplicateSlugViolation = (): PrismaClientKnownRequestError =>
  new PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['slug'] },
  });

describe('CategoriesService', () => {
  let categoriesService: CategoriesService;

  type FindManyArgs = { where: Record<string, unknown> };

  const categoryFindManyMock = jest.fn() as jest.MockedFunction<
    (args: FindManyArgs) => Promise<unknown[]>
  >;

  const categoryFindUniqueMock = jest.fn();
  const categoryCreateMock = jest.fn();
  const categoryUpdateMock = jest.fn();
  const adminActionCreateMock = jest.fn();

  const transactionMock = {
    category: {
      findUnique: categoryFindUniqueMock,
      create: categoryCreateMock,
      update: categoryUpdateMock,
    },
    adminAction: {
      create: adminActionCreateMock,
    },
  };

  type RunTransaction = <T>(
    callback: (transaction: typeof transactionMock) => Promise<T>,
  ) => Promise<T>;

  const runTransactionMock = jest.fn() as jest.MockedFunction<RunTransaction>;

  const createdCategory = {
    id: CATEGORY_ID,
    parentId: null,
    name: 'Watches',
    slug: 'watches',
    description: null,
  };

  const activationRecord = (
    overrides: {
      isActive?: boolean;
      parentId?: string | null;
      parentIsActive?: boolean;
    } = {},
  ) => ({
    id: CATEGORY_ID,
    parentId: overrides.parentId ?? null,
    name: 'Watches',
    slug: 'watches',
    isActive: overrides.isActive ?? true,
    updatedAt: UPDATED_AT,
    parent:
      overrides.parentId === undefined || overrides.parentId === null
        ? null
        : { isActive: overrides.parentIsActive ?? true },
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    categoryFindManyMock.mockResolvedValue([]);
    categoryFindUniqueMock.mockResolvedValue({ id: CATEGORY_ID });
    categoryCreateMock.mockResolvedValue(createdCategory);
    categoryUpdateMock.mockResolvedValue({
      ...createdCategory,
      children: [],
    });
    adminActionCreateMock.mockResolvedValue({});
    runTransactionMock.mockImplementation((callback) =>
      callback(transactionMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: {
            category: { findMany: categoryFindManyMock },
            $transaction: runTransactionMock,
          },
        },
      ],
    }).compile();

    categoriesService = module.get(CategoriesService);
  });

  describe('findActiveTree', () => {
    it('returns only active roots with their active children', async () => {
      await categoriesService.findActiveTree();

      const args = categoryFindManyMock.mock.calls[0][0];

      expect(args.where).toEqual({ parentId: null, isActive: true });
      expect(args).toEqual(
        containing({
          select: containing({
            children: containing({ where: { isActive: true } }),
          }),
        }),
      );
    });
  });

  describe('findAdminTree', () => {
    it('returns every root regardless of activation', async () => {
      await categoriesService.findAdminTree();

      const args = categoryFindManyMock.mock.calls[0][0];

      expect(args.where).toEqual({ parentId: null });
      expect(args.where).not.toHaveProperty('isActive');
    });
  });

  describe('createCategory', () => {
    it('derives a slug and records the admin action', async () => {
      const result = await categoriesService.createCategory({
        adminUserId: ADMIN_ID,
        name: 'Watches',
      });

      expect(categoryCreateMock).toHaveBeenCalledWith(
        containing({
          data: {
            name: 'Watches',
            slug: 'watches',
            description: null,
            parentId: null,
            createdByAdminId: ADMIN_ID,
          },
        }),
      );
      expect(adminActionCreateMock).toHaveBeenCalledWith({
        data: {
          adminUserId: ADMIN_ID,
          categoryId: CATEGORY_ID,
          actionType: AdminActionType.CREATE_CATEGORY,
          note: 'Create category "Watches"',
        },
      });
      expect(result.children).toEqual([]);
    });

    it('rejects a name that produces an empty slug', async () => {
      await expect(
        categoriesService.createCategory({
          adminUserId: ADMIN_ID,
          name: '!!!',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it('rejects a missing parent', async () => {
      categoryFindUniqueMock.mockResolvedValue(null);

      await expect(
        categoriesService.createCategory({
          adminUserId: ADMIN_ID,
          name: 'Dive watches',
          parentId: PARENT_ID,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(categoryCreateMock).not.toHaveBeenCalled();
    });

    it('refuses a third hierarchy level', async () => {
      categoryFindUniqueMock.mockResolvedValue({
        parentId: PARENT_ID,
        isActive: true,
      });

      await expect(
        categoriesService.createCategory({
          adminUserId: ADMIN_ID,
          name: 'Dive watches',
          parentId: CATEGORY_ID,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(categoryCreateMock).not.toHaveBeenCalled();
    });

    it('refuses a child under an inactive parent', async () => {
      categoryFindUniqueMock.mockResolvedValue({
        parentId: null,
        isActive: false,
      });

      await expect(
        categoriesService.createCategory({
          adminUserId: ADMIN_ID,
          name: 'Dive watches',
          parentId: PARENT_ID,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(categoryCreateMock).not.toHaveBeenCalled();
    });

    it('translates a duplicate name or slug into a conflict', async () => {
      categoryCreateMock.mockRejectedValue(duplicateSlugViolation());

      await expect(
        categoriesService.createCategory({
          adminUserId: ADMIN_ID,
          name: 'Watches',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('updateCategory', () => {
    it('requires at least one field', async () => {
      await expect(
        categoriesService.updateCategory({
          adminUserId: ADMIN_ID,
          categoryId: CATEGORY_ID,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it('rejects a category that does not exist', async () => {
      categoryFindUniqueMock.mockResolvedValue(null);

      await expect(
        categoriesService.updateCategory({
          adminUserId: ADMIN_ID,
          categoryId: CATEGORY_ID,
          name: 'Timepieces',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(categoryUpdateMock).not.toHaveBeenCalled();
    });

    it('writes only the supplied fields and names them in the audit note', async () => {
      await categoriesService.updateCategory({
        adminUserId: ADMIN_ID,
        categoryId: CATEGORY_ID,
        name: 'Timepieces',
      });

      expect(categoryUpdateMock).toHaveBeenCalledWith(
        containing({ data: { name: 'Timepieces' } }),
      );
      expect(adminActionCreateMock).toHaveBeenCalledWith({
        data: containing({
          actionType: AdminActionType.UPDATE_CATEGORY,
          note: 'Updated category "Watches": name',
        }),
      });
    });

    it('clears a description supplied as null', async () => {
      await categoriesService.updateCategory({
        adminUserId: ADMIN_ID,
        categoryId: CATEGORY_ID,
        description: null,
      });

      expect(categoryUpdateMock).toHaveBeenCalledWith(
        containing({ data: { description: null } }),
      );
      expect(adminActionCreateMock).toHaveBeenCalledWith({
        data: containing({
          note: 'Updated category "Watches": description',
        }),
      });
    });
  });

  describe('setCategoryActivation', () => {
    it('rejects a category that does not exist', async () => {
      categoryFindUniqueMock.mockResolvedValue(null);

      await expect(
        categoriesService.setCategoryActivation({
          adminUserId: ADMIN_ID,
          categoryId: CATEGORY_ID,
          isActive: false,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deactivates an active category and audits the change', async () => {
      categoryFindUniqueMock.mockResolvedValue(
        activationRecord({ isActive: true }),
      );
      categoryUpdateMock.mockResolvedValue({
        id: CATEGORY_ID,
        parentId: null,
        name: 'Watches',
        slug: 'watches',
        isActive: false,
        updatedAt: UPDATED_AT,
      });

      const result = await categoriesService.setCategoryActivation({
        adminUserId: ADMIN_ID,
        categoryId: CATEGORY_ID,
        isActive: false,
      });

      expect(result.isActive).toBe(false);
      expect(categoryUpdateMock).toHaveBeenCalledWith(
        containing({ data: { isActive: false } }),
      );
      expect(adminActionCreateMock).toHaveBeenCalledWith({
        data: containing({
          actionType: AdminActionType.DEACTIVATE_CATEGORY,
          note: 'Deactivated category "Watches"',
        }),
      });
    });

    it('stays idempotent when the category is already in that state', async () => {
      categoryFindUniqueMock.mockResolvedValue(
        activationRecord({ isActive: false }),
      );

      const result = await categoriesService.setCategoryActivation({
        adminUserId: ADMIN_ID,
        categoryId: CATEGORY_ID,
        isActive: false,
      });

      expect(result.isActive).toBe(false);
      // No second audit row for a repeated request.
      expect(categoryUpdateMock).not.toHaveBeenCalled();
      expect(adminActionCreateMock).not.toHaveBeenCalled();
    });

    it('refuses to activate a child while its parent is inactive', async () => {
      categoryFindUniqueMock.mockResolvedValue(
        activationRecord({
          isActive: false,
          parentId: PARENT_ID,
          parentIsActive: false,
        }),
      );

      await expect(
        categoriesService.setCategoryActivation({
          adminUserId: ADMIN_ID,
          categoryId: CATEGORY_ID,
          isActive: true,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(categoryUpdateMock).not.toHaveBeenCalled();
    });

    it('activates a child once its parent is active', async () => {
      categoryFindUniqueMock.mockResolvedValue(
        activationRecord({
          isActive: false,
          parentId: PARENT_ID,
          parentIsActive: true,
        }),
      );
      categoryUpdateMock.mockResolvedValue({
        id: CATEGORY_ID,
        parentId: PARENT_ID,
        name: 'Watches',
        slug: 'watches',
        isActive: true,
        updatedAt: UPDATED_AT,
      });

      await categoriesService.setCategoryActivation({
        adminUserId: ADMIN_ID,
        categoryId: CATEGORY_ID,
        isActive: true,
      });

      expect(adminActionCreateMock).toHaveBeenCalledWith({
        data: containing({
          actionType: AdminActionType.ACTIVATE_CATEGORY,
          note: 'Activated category "Watches"',
        }),
      });
    });
  });
});
