'use client';

import { AdminCategoryForm } from '@/features/admin/categories/components/admin-category-form';
import {
  useAdminCategories,
  useSetAdminCategoryActivation,
} from '@/features/admin/categories/queries/admin-category.queries';
import type {
  AdminCategory,
  AdminCategoryChild,
} from '@/features/admin/categories/schemas/admin-category.schemas';
import { useAuth } from '@/features/auth/use-auth';
import { formatDateTime } from '@/lib/formatters';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type ManagedCategory = AdminCategory | AdminCategoryChild;

type SelectedCategoryForm =
  | {
      mode: 'create';
    }
  | {
      mode: 'edit';
      category: ManagedCategory;
    }
  | null;

type CategorySummaryProps = {
  category: ManagedCategory;
  kind: 'root' | 'child';
  activationError?: string;
  isActivationPending: boolean;
  onEdit: () => void;
  onToggleActivation: () => void;
};

const statusClassNames = {
  active: 'border-success/30 bg-success/10 text-success',
  inactive: 'border-danger/30 bg-danger/10 text-danger',
};

function CategorySummary({
  category,
  kind,
  activationError,
  isActivationPending,
  onEdit,
  onToggleActivation,
}: CategorySummaryProps) {
  return (
    <article className='rounded-2xl border border-border bg-surface p-5'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='text-xs font-black tracking-wider text-primary uppercase'>
            {kind === 'root' ? 'Root category' : 'Child category'}
          </p>

          <h3 className='mt-2 text-xl font-black text-foreground'>
            {category.name}
          </h3>

          <p className='mt-1 text-sm text-muted'>/{category.slug}</p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${
            category.isActive
              ? statusClassNames.active
              : statusClassNames.inactive
          }`}
        >
          {category.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <p className='mt-4 min-h-12 text-sm leading-6 text-muted'>
        {category.description ?? 'No public description.'}
      </p>

      <div className='mt-5 grid gap-3 border-t border-border pt-5 text-sm sm:grid-cols-2'>
        <div>
          <p className='text-xs font-bold tracking-wider text-muted uppercase'>
            Created
          </p>

          <p className='mt-1 text-foreground'>
            {formatDateTime(category.createdAt)}
          </p>
        </div>

        <div>
          <p className='text-xs font-bold tracking-wider text-muted uppercase'>
            Updated
          </p>

          <p className='mt-1 text-foreground'>
            {formatDateTime(category.updatedAt)}
          </p>
        </div>
      </div>

      {activationError && (
        <div
          role='alert'
          className='mt-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger'
        >
          {activationError}
        </div>
      )}

      <div className='mt-5 flex flex-wrap justify-end gap-3'>
        <button
          type='button'
          className='min-h-10 rounded-full border border-border px-4 text-sm font-bold text-foreground transition hover:border-primary/60 hover:text-primary'
          onClick={onEdit}
        >
          Edit
        </button>

        <button
          type='button'
          disabled={isActivationPending}
          className={`min-h-10 rounded-full border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            category.isActive
              ? 'border-danger/40 text-danger hover:bg-danger/10'
              : 'border-success/40 text-success hover:bg-success/10'
          }`}
          onClick={onToggleActivation}
        >
          {isActivationPending
            ? 'Updating...'
            : category.isActive
              ? 'Deactivate'
              : 'Activate'}
        </button>
      </div>
    </article>
  );
}

export function AdminCategoriesScreen() {
  const router = useRouter();
  const { status, user } = useAuth();
  const [selectedForm, setSelectedForm] = useState<SelectedCategoryForm>(null);
  const categoryFormRef = useRef<HTMLDivElement>(null);

  const isAdmin = status === 'authenticated' && user?.role === 'ADMIN';

  const categoriesQuery = useAdminCategories(isAdmin);
  const activationMutation = useSetAdminCategoryActivation();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth');
      return;
    }

    if (status === 'authenticated' && user?.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [router, status, user?.role]);

  useEffect(() => {
    if (!selectedForm) {
      return;
    }

    categoryFormRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [selectedForm]);

  if (!isAdmin) {
    return (
      <div className='mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8'>
        <div className='h-96 animate-pulse rounded-3xl border border-border bg-surface' />
      </div>
    );
  }

  const categories = categoriesQuery.data ?? [];

  const activationError =
    activationMutation.error instanceof Error
      ? activationMutation.error.message
      : 'The category status could not be updated.';

  const toggleActivation = async (category: ManagedCategory) => {
    try {
      await activationMutation.mutateAsync({
        categoryId: category.id,
        isActive: !category.isActive,
      });
    } catch {
      // The mutation error is rendered on the matching category.
    }
  };

  return (
    <section className='mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8'>
      <div className='flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-black tracking-[0.22em] text-primary uppercase'>
            Administration
          </p>

          <h1 className='mt-3 text-3xl font-black tracking-tight text-foreground sm:text-5xl'>
            Category management
          </h1>

          <p className='mt-3 text-base leading-7 text-muted'>
            Organize marketplace categories and control their public
            availability.
          </p>
        </div>

        <button
          type='button'
          className='min-h-11 rounded-full bg-primary px-6 text-sm font-black text-background transition hover:bg-primary-strong'
          onClick={() => setSelectedForm({ mode: 'create' })}
        >
          Create category
        </button>
      </div>

      {selectedForm && (
        <div ref={categoryFormRef} className='mt-10 scroll-mt-24'>
          <AdminCategoryForm
            key={
              selectedForm.mode === 'edit'
                ? `edit-${selectedForm.category.id}`
                : 'create-category'
            }
            category={
              selectedForm.mode === 'edit' ? selectedForm.category : undefined
            }
            rootCategories={categories}
            onCancel={() => setSelectedForm(null)}
            onSuccess={() => setSelectedForm(null)}
          />
        </div>
      )}

      {categoriesQuery.isPending && (
        <div className='mt-10 grid gap-5 sm:grid-cols-2'>
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className='h-64 animate-pulse rounded-2xl border border-border bg-surface'
            />
          ))}
        </div>
      )}

      {categoriesQuery.isError && (
        <div
          role='alert'
          className='mt-10 rounded-2xl border border-danger/30 bg-danger/5 p-6 text-danger'
        >
          {categoriesQuery.error instanceof Error
            ? categoriesQuery.error.message
            : 'Categories could not be loaded.'}
        </div>
      )}

      {!categoriesQuery.isPending &&
        !categoriesQuery.isError &&
        categories.length === 0 && (
          <div className='mt-10 rounded-3xl border border-dashed border-border p-12 text-center'>
            <h2 className='text-2xl font-black text-foreground'>
              No categories yet
            </h2>

            <p className='mt-2 text-muted'>
              Create the first root category to organize marketplace auctions.
            </p>
          </div>
        )}

      {!categoriesQuery.isPending &&
        !categoriesQuery.isError &&
        categories.length > 0 && (
          <div className='mt-10 space-y-8'>
            {categories.map((rootCategory) => (
              <section
                key={rootCategory.id}
                className='rounded-3xl border border-border bg-background p-4 sm:p-6'
              >
                <CategorySummary
                  category={rootCategory}
                  kind='root'
                  isActivationPending={
                    activationMutation.isPending &&
                    activationMutation.variables?.categoryId === rootCategory.id
                  }
                  activationError={
                    activationMutation.isError &&
                    activationMutation.variables?.categoryId === rootCategory.id
                      ? activationError
                      : undefined
                  }
                  onEdit={() =>
                    setSelectedForm({
                      mode: 'edit',
                      category: rootCategory,
                    })
                  }
                  onToggleActivation={() => {
                    void toggleActivation(rootCategory);
                  }}
                />

                <div className='mt-5'>
                  <h2 className='text-sm font-black tracking-wider text-muted uppercase'>
                    Child categories
                  </h2>

                  {rootCategory.children.length === 0 ? (
                    <p className='mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted'>
                      This root category has no child categories.
                    </p>
                  ) : (
                    <div className='mt-3 grid gap-4 lg:grid-cols-2'>
                      {rootCategory.children.map((childCategory) => (
                        <CategorySummary
                          key={childCategory.id}
                          category={childCategory}
                          kind='child'
                          isActivationPending={
                            activationMutation.isPending &&
                            activationMutation.variables?.categoryId ===
                              childCategory.id
                          }
                          activationError={
                            activationMutation.isError &&
                            activationMutation.variables?.categoryId ===
                              childCategory.id
                              ? activationError
                              : undefined
                          }
                          onEdit={() =>
                            setSelectedForm({
                              mode: 'edit',
                              category: childCategory,
                            })
                          }
                          onToggleActivation={() => {
                            void toggleActivation(childCategory);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
    </section>
  );
}
