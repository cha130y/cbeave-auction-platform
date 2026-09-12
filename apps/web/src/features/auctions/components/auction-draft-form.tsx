'use client';

import { cn } from '@/lib/utils/cn';
import {
  fieldClassName,
  textareaClassName,
} from '@/components/ui/field-styles';
import { readErrorMessage } from '@/lib/api/error-message';
import {
  auctionDraftFormSchema,
  type AuctionDraftFormValues,
} from '@/features/auctions/schemas/auction-draft.schemas';
import { useActiveCategories } from '@/features/categories/queries/category.queries';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useSyncExternalStore } from 'react';
import { useForm, useWatch } from 'react-hook-form';

const dateTimeFieldClassName = `${fieldClassName} scheme-dark`;

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * A `datetime-local` input expects `YYYY-MM-DDTHH:mm` in local time. Reading
 * the parts off the date directly keeps the timezone offset from shifting it.
 */
function formatDateTimeLocal(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// The strings are fixed-width and zero-padded, so comparing them as text
// compares the instants they name.
const earliest = (a: string, b: string) => (!a ? b : !b ? a : a < b ? a : b);
const latest = (a: string, b: string) => (!a ? b : !b ? a : a > b ? a : b);

/**
 * `min` is inclusive, so the earliest minute the end may sit on is the one
 * after the start rather than the start itself.
 */
function nextMinute(local: string): string {
  if (!local) {
    return '';
  }

  const date = new Date(local);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  date.setMinutes(date.getMinutes() + 1);

  return formatDateTimeLocal(date);
}

/**
 * "Now", to the minute. Reading the clock during the server pass would bake a
 * different instant into the HTML than hydration computes, so the server
 * renders no bound at all and the client fills one in afterwards.
 */
const subscribeToClock = () => () => {};
const readMinuteNow = () => formatDateTimeLocal(new Date());
const readNoMinute = () => '';

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
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<AuctionDraftFormValues>({
    defaultValues,
    resolver: zodResolver(auctionDraftFormSchema),
  });

  const now = useSyncExternalStore(
    subscribeToClock,
    readMinuteNow,
    readNoMinute,
  );

  const scheduledStartAt = useWatch({
    control,
    name: 'scheduledStartAt',
  });

  const scheduledEndAt = useWatch({
    control,
    name: 'scheduledEndAt',
  });

  /**
   * A schedule pointing into the past is a slip, so the picker greys it out.
   * A draft saved earlier is the exception: its schedule may already have gone
   * by, and clamping to now would mark the prefilled value out of range. The
   * floor therefore drops only for a value that is still the one that loaded.
   */
  const startMin =
    scheduledStartAt === defaultValues.scheduledStartAt
      ? earliest(defaultValues.scheduledStartAt, now)
      : now;

  const endFloor = latest(now, nextMinute(scheduledStartAt));
  const endMin =
    scheduledEndAt === defaultValues.scheduledEndAt
      ? earliest(defaultValues.scheduledEndAt, endFloor)
      : endFloor;

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
      setRequestError(
        readErrorMessage(
          error,
          'The auction draft could not be saved. Please try again.',
        ),
      );
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
            className={cn(textareaClassName, 'min-h-36')}
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
              min={startMin}
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
              min={endMin}
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
