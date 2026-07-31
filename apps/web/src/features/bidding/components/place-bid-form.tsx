'use client';

import type { PublicAuctionDetail } from '@/features/auctions/schemas/auction.schemas';
import { useAuth } from '@/features/auth/use-auth';
import { usePlaceBid } from '@/features/bidding/queries/bidding.queries';
import {
  createPlaceBidFormSchema,
  type PlaceBidFormValues,
} from '@/features/bidding/schemas/bidding.schemas';
import { formatMoney } from '@/lib/formatters';
import { addMoneyAmounts } from '@/lib/money';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

type PlaceBidFormProps = {
  auction: Pick<
    PublicAuctionDetail,
    'id' | 'status' | 'currency' | 'currentPrice' | 'minBidIncrement' | 'seller'
  >;
  minimumNextBid?: string;
  canBid?: boolean;
};

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Your bid could not be placed. Please try again.';
}

export function PlaceBidForm({
  auction,
  minimumNextBid,
  canBid = true,
}: PlaceBidFormProps) {
  const { status, user } = useAuth();
  const placeBidMutation = usePlaceBid();

  const minimumBid =
    minimumNextBid ??
    addMoneyAmounts(auction.currentPrice, auction.minBidIncrement);

  const [requestError, setRequestError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<PlaceBidFormValues>({
    defaultValues: {
      amount: '',
    },
    resolver: zodResolver(createPlaceBidFormSchema(minimumBid)),
  });

  const submit = handleSubmit(async (values) => {
    setRequestError(null);
    setSuccessMessage(null);

    try {
      const acceptedBid = await placeBidMutation.mutateAsync({
        auctionId: auction.id,
        amount: values.amount,
      });

      setSuccessMessage(
        `Bid accepted at ${formatMoney(acceptedBid.amount, auction.currency)}.`,
      );

      reset({
        amount: '',
      });
    } catch (error) {
      setRequestError(readErrorMessage(error));
    }
  });

  if (auction.status !== 'ACTIVE') {
    return (
      <div className='rounded-2xl border border-border bg-surface-muted p-5'>
        <p className='font-bold text-foreground'>Bidding is not open</p>

        <p className='mt-1 text-sm text-muted'>
          Bids can only be placed while this auction is live.
        </p>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className='rounded-2xl border border-border bg-surface-muted p-5 text-sm text-muted'>
        Checking your account…
      </div>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return (
      <div className='rounded-2xl border border-primary/25 bg-primary/5 p-5'>
        <p className='font-bold text-foreground'>Sign in to place a bid</p>

        <p className='mt-1 text-sm text-muted'>
          You need an authenticated bidder account before bidding.
        </p>

        <Link
          href='/auth'
          className='mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 font-bold text-background transition hover:bg-primary/90'
        >
          Log in or register
        </Link>
      </div>
    );
  }

  if (user.id === auction.seller.id) {
    return (
      <div className='rounded-2xl border border-border bg-surface-muted p-5'>
        <p className='font-bold text-foreground'>This is your auction</p>

        <p className='mt-1 text-sm text-muted'>
          Sellers cannot bid on their own auctions.
        </p>
      </div>
    );
  }

  if (user.role !== 'USER') {
    return (
      <div className='rounded-2xl border border-border bg-surface-muted p-5'>
        <p className='font-bold text-foreground'>
          Bidding is unavailable for this account
        </p>

        <p className='mt-1 text-sm text-muted'>
          Only regular user accounts can place bids.
        </p>
      </div>
    );
  }

  if (!canBid) {
    return (
      <div className='rounded-2xl border border-border bg-surface-muted p-5'>
        <p className='font-bold text-foreground'>
          Bidding is unavailable for this account
        </p>

        <p className='mt-1 text-sm text-muted'>
          This account is not eligible to bid in the current auction.
        </p>
      </div>
    );
  }

  return (
    <form
      className='rounded-2xl border border-primary/25 bg-primary/5 p-5'
      onSubmit={submit}
      noValidate
    >
      <div className='flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h2 className='text-lg font-extrabold text-foreground'>
            Place your bid
          </h2>

          <p className='mt-1 text-sm text-muted'>
            Minimum next bid:{' '}
            <span className='font-bold text-foreground'>
              {formatMoney(minimumBid, auction.currency)}
            </span>
          </p>
        </div>
      </div>

      {requestError && (
        <p
          className='mt-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger'
          role='alert'
        >
          {requestError}
        </p>
      )}

      {successMessage && (
        <p
          className='mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-300'
          role='status'
        >
          {successMessage}
        </p>
      )}

      <div className='mt-5 flex flex-col gap-3 sm:flex-row'>
        <div className='flex-1'>
          <label
            htmlFor='bid-amount'
            className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'
          >
            Your bid
          </label>

          <input
            id='bid-amount'
            type='text'
            inputMode='decimal'
            placeholder={minimumBid}
            className='h-12 w-full rounded-xl border border-border bg-background px-4 font-mono text-foreground outline-none transition placeholder:text-muted/50 focus:border-primary/70 focus:ring-3 focus:ring-primary/10'
            aria-invalid={Boolean(errors.amount)}
            {...register('amount')}
          />

          {errors.amount && (
            <p className='mt-1.5 text-xs text-danger' role='alert'>
              {errors.amount.message}
            </p>
          )}
        </div>

        <button
          type='submit'
          disabled={isSubmitting || placeBidMutation.isPending}
          className='min-h-12 rounded-xl bg-primary px-7 font-bold text-background transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:self-end'
        >
          {isSubmitting || placeBidMutation.isPending
            ? 'Placing bid…'
            : 'Place bid'}
        </button>
      </div>

      <p className='mt-3 text-xs leading-5 text-muted'>
        Your bid is final after the server accepts it.
      </p>
    </form>
  );
}
