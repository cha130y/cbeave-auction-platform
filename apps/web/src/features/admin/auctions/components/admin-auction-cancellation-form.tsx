'use client';

import { useCancelAdminAuction } from '@/features/admin/auctions/queries/admin-auction.queries';
import {
  cancelAdminAuctionFormSchema,
  type AdminAuction,
  type CancelAdminAuctionFormValues,
} from '@/features/admin/auctions/schemas/admin-auction.schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

type AdminAuctionCancellationFormProps = {
  auction: AdminAuction;
  onCancel: () => void;
  onSuccess: () => void;
};

export function AdminAuctionCancellationForm({
  auction,
  onCancel,
  onSuccess,
}: AdminAuctionCancellationFormProps) {
  const cancelMutation = useCancelAdminAuction();

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<CancelAdminAuctionFormValues>({
    defaultValues: {
      reason: '',
    },
    resolver: zodResolver(cancelAdminAuctionFormSchema),
  });

  const submit = handleSubmit(async (values) => {
    try {
      await cancelMutation.mutateAsync({
        auctionId: auction.id,
        reason: values.reason,
      });

      onSuccess();
    } catch {
      // The mutation error is rendered below.
    }
  });

  return (
    <form
      className='rounded-2xl border border-danger/30 bg-danger/5 p-5 sm:p-6'
      onSubmit={submit}
      noValidate
    >
      <div>
        <p className='text-xs font-black tracking-wider text-danger uppercase'>
          Cancel auction
        </p>

        <h3 className='mt-2 text-xl font-black text-foreground'>
          {auction.title}
        </h3>

        <p className='mt-1 text-sm text-muted'>
          Listed by {auction.seller.displayName} · {auction.seller.email}
        </p>
      </div>

      <label className='mt-5 block'>
        <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
          Audit reason
        </span>

        <textarea
          {...register('reason')}
          autoFocus
          rows={4}
          className='w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition placeholder:text-muted/50 focus:border-danger/70 focus:ring-3 focus:ring-danger/10'
          placeholder='Explain why this auction is being cancelled.'
        />

        {errors.reason && (
          <p className='mt-1.5 text-xs text-danger' role='alert'>
            {errors.reason.message}
          </p>
        )}
      </label>

      {cancelMutation.isError && (
        <div
          role='alert'
          className='mt-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger'
        >
          {cancelMutation.error instanceof Error
            ? cancelMutation.error.message
            : 'The auction could not be cancelled.'}
        </div>
      )}

      <div className='mt-5 flex flex-wrap justify-end gap-3'>
        <button
          type='button'
          disabled={cancelMutation.isPending}
          className='min-h-11 rounded-full border border-border px-5 text-sm font-bold text-foreground transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
          onClick={onCancel}
        >
          Keep auction
        </button>

        <button
          type='submit'
          disabled={cancelMutation.isPending}
          className='min-h-11 rounded-full bg-danger px-5 text-sm font-black text-white transition hover:bg-danger/80 disabled:cursor-not-allowed disabled:opacity-50'
        >
          {cancelMutation.isPending ? 'Cancelling...' : 'Confirm cancellation'}
        </button>
      </div>
    </form>
  );
}
