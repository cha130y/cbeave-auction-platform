'use client';

import {
  useCreateAdminCategory,
  useUpdateAdminCategory,
} from '@/features/admin/categories/queries/admin-category.queries';
import {
  createAdminCategoryFormSchema,
  type AdminCategory,
  type AdminCategoryChild,
  type CreateAdminCategoryFormValues,
} from '@/features/admin/categories/schemas/admin-category.schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

type EditableAdminCategory = AdminCategory | AdminCategoryChild;

type AdminCategoryFormProps = {
  category?: EditableAdminCategory;
  rootCategories: AdminCategory[];
  onCancel: () => void;
  onSuccess: () => void;
};

const fieldClassName =
  'w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition placeholder:text-muted/50 focus:border-primary/70 focus:ring-3 focus:ring-primary/10';

export function AdminCategoryForm({
  category,
  rootCategories,
  onCancel,
  onSuccess,
}: AdminCategoryFormProps) {
  const createMutation = useCreateAdminCategory();
  const updateMutation = useUpdateAdminCategory();

  const isEditing = category !== undefined;
  const activeMutation = isEditing ? updateMutation : createMutation;

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<CreateAdminCategoryFormValues>({
    defaultValues: {
      name: category?.name ?? '',
      description: category?.description ?? '',
      parentId: category?.parentId ?? '',
    },
    resolver: zodResolver(createAdminCategoryFormSchema),
  });

  const submit = handleSubmit(async (values) => {
    try {
      if (category) {
        await updateMutation.mutateAsync({
          categoryId: category.id,
          name: values.name,
          description: values.description,
        });
      } else {
        await createMutation.mutateAsync(values);
      }

      onSuccess();
    } catch {}
  });

  return (
    <form
      className='rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6'
      onSubmit={submit}
      noValidate
    >
      <div>
        <p className='text-xs font-black tracking-wider text-primary uppercase'>
          {isEditing ? 'Edit category' : 'Create category'}
        </p>

        <h3 className='mt-2 text-xl font-black text-foreground'>
          {isEditing ? category.name : 'New marketplace category'}
        </h3>

        <p className='mt-1 text-sm leading-6 text-muted'>
          {isEditing
            ? 'Update the category name or public description.'
            : 'Create a root category or place it under an existing root category.'}
        </p>
      </div>

      <div className='mt-5 grid gap-5 sm:grid-cols-2'>
        <label className='block'>
          <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
            Name
          </span>

          <input
            {...register('name')}
            autoFocus
            className={fieldClassName}
            placeholder='Bikes and Bicycles'
          />

          {errors.name && (
            <p className='mt-1.5 text-xs text-danger' role='alert'>
              {errors.name.message}
            </p>
          )}
        </label>

        {!isEditing && (
          <label className='block'>
            <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
              Parent category
            </span>

            <select {...register('parentId')} className={fieldClassName}>
              <option value=''>No parent — create a root category</option>

              {rootCategories.map((rootCategory) => (
                <option key={rootCategory.id} value={rootCategory.id}>
                  {rootCategory.name}
                </option>
              ))}
            </select>

            {errors.parentId && (
              <p className='mt-1.5 text-xs text-danger' role='alert'>
                {errors.parentId.message}
              </p>
            )}
          </label>
        )}
      </div>

      <label className='mt-5 block'>
        <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
          Description <span className='normal-case'>(optional)</span>
        </span>

        <textarea
          {...register('description')}
          rows={4}
          className={`${fieldClassName} resize-y`}
          placeholder='Describe the auctions that belong in this category.'
        />

        {errors.description && (
          <p className='mt-1.5 text-xs text-danger' role='alert'>
            {errors.description.message}
          </p>
        )}
      </label>

      {activeMutation.isError && (
        <div
          role='alert'
          className='mt-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger'
        >
          {activeMutation.error instanceof Error
            ? activeMutation.error.message
            : 'The category could not be saved.'}
        </div>
      )}

      <div className='mt-5 flex flex-wrap justify-end gap-3'>
        <button
          type='button'
          disabled={activeMutation.isPending}
          className='min-h-11 rounded-full border border-border px-5 text-sm font-bold text-foreground transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
          onClick={onCancel}
        >
          Cancel
        </button>

        <button
          type='submit'
          disabled={activeMutation.isPending}
          className='min-h-11 rounded-full bg-primary px-5 text-sm font-black text-background transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-50'
        >
          {activeMutation.isPending
            ? 'Saving...'
            : isEditing
              ? 'Save changes'
              : 'Create category'}
        </button>
      </div>
    </form>
  );
}
