'use client';

import { useCancelOwnedAuction } from '@/features/auctions/queries/auction.queries';
import {
  cancelOwnedAuctionFormSchema,
  type CancelOwnedAuctionFormValues,
} from '@/features/auctions/schemas/auction-draft.schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

type CancelOwnedAuctionFormProps = {
  auctionId: string;
  onClose: () => void;
};

export function CancelOwnedAuctionForm({
  auctionId,
  onClose,
}: CancelOwnedAuctionFormProps) {
  const cancelMutation = useCancelOwnedAuction();

  const form = useForm<CancelOwnedAuctionFormValues>({
    resolver: zodResolver(cancelOwnedAuctionFormSchema),
    defaultValues: {
      reason: '',
    },
  });

  async function submitCancellation(values: CancelOwnedAuctionFormValues) {
    try {
      await cancelMutation.mutateAsync({
        auctionId,
        reason: values.reason,
      });

      form.reset();
      onClose();
    } catch {
      // The mutation error is displayed below the form.
    }
  }

  return (
    <form
      className='rounded-2xl border border-danger/30 bg-danger/5 p-4'
      onSubmit={form.handleSubmit(submitCancellation)}
    >
      <label
        htmlFor={`cancellation-reason-${auctionId}`}
        className='text-xs font-bold tracking-wider text-foreground uppercase'
      >
        Cancellation reason
      </label>

      <textarea
        id={`cancellation-reason-${auctionId}`}
        rows={4}
        placeholder='Explain why this auction is being cancelled.'
        className='mt-2 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted/60 focus:border-danger'
        {...form.register('reason')}
      />

      {form.formState.errors.reason && (
        <p className='mt-2 text-sm text-danger'>
          {form.formState.errors.reason.message}
        </p>
      )}

      {cancelMutation.isError && (
        <p className='mt-2 text-sm text-danger' role='alert'>
          {cancelMutation.error instanceof Error
            ? cancelMutation.error.message
            : 'The auction could not be cancelled.'}
        </p>
      )}

      <div className='mt-4 flex flex-wrap justify-end gap-3'>
        <button
          type='button'
          className='min-h-10 rounded-full border border-border px-5 text-sm font-bold text-foreground transition hover:border-foreground'
          disabled={cancelMutation.isPending}
          onClick={onClose}
        >
          Keep auction
        </button>

        <button
          type='submit'
          className='min-h-10 rounded-full bg-danger px-5 text-sm font-bold text-white transition hover:bg-danger/80 disabled:cursor-not-allowed disabled:opacity-50'
          disabled={cancelMutation.isPending}
        >
          {cancelMutation.isPending ? 'Cancelling...' : 'Confirm cancellation'}
        </button>
      </div>
    </form>
  );
}
