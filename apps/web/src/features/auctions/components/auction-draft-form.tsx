'use client';

import {
  auctionDraftFormSchema,
  type AuctionDraftFormValues,
} from '@/features/auctions/schemas/auction-draft.schemas';
import { useActiveCategories } from '@/features/categories/queries/category.queries';
import { ApiError } from '@/lib/api/api-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

const fieldClassName =
  'h-12 w-full rounded-xl border border-border bg-background px-4 text-foreground outline-none transition placeholder:text-muted/50 focus:border-primary/70 focus:ring-3 focus:ring-primary/10';

const dateTimeFieldClassName = `${fieldClassName} scheme-dark`;

function readErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'The auction draft could not be saved. Please try again.';
}

type AuctionDraftFormProps = {
  defaultValues: AuctionDraftFormValues;
  eyebrow: string;
  title: string;
  description: string;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: AuctionDraftFormValues) => Promise<void>;
};

export function AuctionDraftForm({
  defaultValues,
  eyebrow,
  title,
  description,
  submitLabel,
  submittingLabel,
  onSubmit,
}: AuctionDraftFormProps) {
  const { data: categories = [], isPending: categoriesPending } =
    useActiveCategories();

  const [requestError, setRequestError] = useState<string | null>(null);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<AuctionDraftFormValues>({
    defaultValues,
    resolver: zodResolver(auctionDraftFormSchema),
  });

  const categoryOptions = categories.flatMap((category) => [
    {
      id: category.id,
      label: category.name,
    },
    ...category.children.map((child) => ({
      id: child.id,
      label: `${category.name} / ${child.name}`,
    })),
  ]);

  const submit = handleSubmit(async (values) => {
    setRequestError(null);

    try {
      await onSubmit(values);
    } catch (error) {
      setRequestError(readErrorMessage(error));
    }
  });

  return (
    <section className='mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8'>
      <div className='mb-8'>
        <p className='text-xs font-black tracking-[0.22em] text-primary uppercase'>
          {eyebrow}
        </p>

        <h1 className='mt-3 text-4xl font-black tracking-tight text-foreground sm:text-5xl'>
          {title}
        </h1>

        <p className='mt-3 text-base leading-7 text-muted'>{description}</p>
      </div>

      <form
        className='space-y-6 rounded-3xl border border-border bg-surface px-5 py-6 sm:px-8 sm:py-8'
        onSubmit={submit}
        noValidate
      >
        {requestError && (
          <div
            className='rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger'
            role='alert'
          >
            {requestError}
          </div>
        )}

        <label className='block'>
          <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
            Category
          </span>

          <select
            {...register('categoryId')}
            className={fieldClassName}
            disabled={categoriesPending}
          >
            <option value=''>
              {categoriesPending
                ? 'Loading categories...'
                : 'Select a category'}
            </option>

            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>

          {errors.categoryId && (
            <p className='mt-1.5 text-xs text-danger' role='alert'>
              Please select a category
            </p>
          )}
        </label>

        <label className='block'>
          <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
            Title
          </span>

          <input
            {...register('title')}
            className={fieldClassName}
            placeholder='Vintage mountain bicycle'
          />

          {errors.title && (
            <p className='mt-1.5 text-xs text-danger' role='alert'>
              {errors.title.message}
            </p>
          )}
        </label>

        <label className='block'>
          <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
            Description
          </span>

          <textarea
            {...register('description')}
            className='min-h-36 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition placeholder:text-muted/50 focus:border-primary/70 focus:ring-3 focus:ring-primary/10'
            placeholder='Describe the item, its condition, and important details.'
          />

          {errors.description && (
            <p className='mt-1.5 text-xs text-danger' role='alert'>
              {errors.description.message}
            </p>
          )}
        </label>

        <div className='grid gap-5 sm:grid-cols-3'>
          <label className='block'>
            <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
              Starting price
            </span>

            <input
              {...register('startingPrice')}
              className={fieldClassName}
              inputMode='decimal'
              placeholder='100.00'
            />

            {errors.startingPrice && (
              <p className='mt-1.5 text-xs text-danger' role='alert'>
                {errors.startingPrice.message}
              </p>
            )}
          </label>

          <label className='block'>
            <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
              Reserve price
            </span>

            <input
              {...register('reservePrice')}
              className={fieldClassName}
              inputMode='decimal'
              placeholder='Optional'
            />

            {errors.reservePrice && (
              <p className='mt-1.5 text-xs text-danger' role='alert'>
                {errors.reservePrice.message}
              </p>
            )}
          </label>

          <label className='block'>
            <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
              Minimum increment
            </span>

            <input
              {...register('minBidIncrement')}
              className={fieldClassName}
              inputMode='decimal'
              placeholder='5.00'
            />

            {errors.minBidIncrement && (
              <p className='mt-1.5 text-xs text-danger' role='alert'>
                {errors.minBidIncrement.message}
              </p>
            )}
          </label>
        </div>

        <div className='grid gap-5 sm:grid-cols-2'>
          <label className='block'>
            <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
              Scheduled start
              <span className='ml-1 font-normal tracking-normal normal-case'>
                (optional)
              </span>
            </span>

            <input
              {...register('scheduledStartAt')}
              className={dateTimeFieldClassName}
              type='datetime-local'
            />

            {errors.scheduledStartAt && (
              <p className='mt-1.5 text-xs text-danger' role='alert'>
                {errors.scheduledStartAt.message}
              </p>
            )}
          </label>

          <label className='block'>
            <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
              Scheduled end
              <span className='ml-1 font-normal tracking-normal normal-case'>
                (optional)
              </span>
            </span>

            <input
              {...register('scheduledEndAt')}
              className={dateTimeFieldClassName}
              type='datetime-local'
            />

            {errors.scheduledEndAt && (
              <p className='mt-1.5 text-xs text-danger' role='alert'>
                {errors.scheduledEndAt.message}
              </p>
            )}
          </label>
        </div>

        <p className='text-xs leading-5 text-muted'>
          To schedule the auction, provide both start and end times. Times use
          your device&apos;s local timezone.
        </p>

        <div className='flex justify-end border-t border-border pt-6'>
          <button
            type='submit'
            className='min-h-12 rounded-full bg-primary px-7 text-sm font-black text-background transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60'
            disabled={
              isSubmitting || categoriesPending || categoryOptions.length === 0
            }
          >
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
