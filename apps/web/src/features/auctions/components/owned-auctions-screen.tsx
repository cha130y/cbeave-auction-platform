'use client';

import {
  useDeleteOwnedAuctionDraft,
  useOwnedAuctions,
} from '@/features/auctions/queries/auction.queries';
import type { OwnedAuctionStatus } from '@/features/auctions/schemas/auction-draft.schemas';
import { useAuth } from '@/features/auth/use-auth';
import { formatDateTime, formatMoney } from '@/lib/formatters';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const statusLabels: Record<OwnedAuctionStatus, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  ACTIVE: 'Live',
  SOLD: 'Sold',
  UNSOLD: 'Unsold',
  CANCELLED: 'Cancelled',
};

const statusClasses: Record<OwnedAuctionStatus, string> = {
  DRAFT: 'bg-warning/10 text-warning',
  SCHEDULED: 'bg-primary/10 text-primary',
  ACTIVE: 'bg-danger/10 text-danger',
  SOLD: 'bg-success/10 text-success',
  UNSOLD: 'bg-surface-muted text-muted',
  CANCELLED: 'bg-danger/10 text-danger',
};

export function OwnedAuctionsScreen() {
  const router = useRouter();
  const { status } = useAuth();
  const [statusFilter, setStatusFilter] = useState<OwnedAuctionStatus | ''>('');

  const auctionsQuery = useOwnedAuctions({
    limit: 50,
    status: statusFilter || undefined,
  });

  const deleteMutation = useDeleteOwnedAuctionDraft();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth');
    }
  }, [router, status]);

  if (status !== 'authenticated' || auctionsQuery.isPending) {
    return (
      <div className='mx-auto w-full max-w-360 px-4 py-16 sm:px-6 lg:px-8'>
        <div className='h-120 animate-pulse rounded-3xl border border-border bg-surface' />
      </div>
    );
  }

  if (auctionsQuery.isError) {
    return (
      <section className='mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6'>
        <h1 className='text-3xl font-black text-foreground'>
          Your auctions could not be loaded
        </h1>

        <p className='mt-3 text-muted'>
          Please refresh the page or try again later.
        </p>
      </section>
    );
  }

  const auctions = auctionsQuery.data.items;

  function deleteDraft(auctionId: string, title: string) {
    const confirmed = window.confirm(
      `Delete the draft "${title}"? This action cannot be undone.`,
    );

    if (confirmed) {
      deleteMutation.mutate(auctionId);
    }
  }

  return (
    <section className='mx-auto w-full max-w-360 px-4 py-10 sm:px-6 sm:py-16 lg:px-8'>
      <div className='flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-black tracking-[0.22em] text-primary uppercase'>
            Seller workspace
          </p>

          <h1 className='mt-3 text-4xl font-black tracking-tight text-foreground sm:text-5xl'>
            My auctions
          </h1>

          <p className='mt-3 text-base leading-7 text-muted'>
            Continue drafts and review your published auctions.
          </p>
        </div>

        <div className='flex flex-col gap-3 sm:items-end'>
          <label
            htmlFor='owned-auction-status'
            className='text-xs font-bold tracking-wider text-muted uppercase'
          >
            Auction status
          </label>

          <select
            id='owned-auction-status'
            value={statusFilter}
            className='min-h-11 rounded-xl border border-border bg-surface px-4 text-foreground outline-none focus:border-primary'
            onChange={(event) => {
              setStatusFilter(event.target.value as OwnedAuctionStatus | '');
            }}
          >
            <option value=''>All statuses</option>
            <option value='DRAFT'>Draft</option>
            <option value='SCHEDULED'>Scheduled</option>
            <option value='ACTIVE'>Active</option>
            <option value='SOLD'>Sold</option>
            <option value='UNSOLD'>Unsold</option>
            <option value='CANCELLED'>Cancelled</option>
          </select>
        </div>
      </div>

      <div className='mt-8 flex justify-end'>
        <Link
          href='/sell'
          className='inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-black text-background transition hover:bg-primary-strong'
        >
          Create another auction
        </Link>
      </div>

      {deleteMutation.isError && (
        <div
          className='mt-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger'
          role='alert'
        >
          {deleteMutation.error instanceof Error
            ? deleteMutation.error.message
            : 'The auction draft could not be deleted.'}
        </div>
      )}

      {auctions.length === 0 ? (
        <div className='mt-10 rounded-3xl border border-dashed border-border px-6 py-16 text-center'>
          <h2 className='text-xl font-extrabold text-foreground'>
            No matching auctions
          </h2>

          <p className='mt-2 text-muted'>
            Create an auction or choose another status filter.
          </p>
        </div>
      ) : (
        <div className='mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {auctions.map((auction) => {
            const isDeleting =
              deleteMutation.isPending &&
              deleteMutation.variables === auction.id;

            const destination =
              auction.status === 'DRAFT'
                ? `/sell/${auction.id}`
                : auction.status === 'CANCELLED'
                  ? null
                  : `/auctions/${auction.id}`;

            return (
              <article
                key={auction.id}
                className='overflow-hidden rounded-3xl border border-border bg-surface'
              >
                <div className='relative aspect-4/3 overflow-hidden bg-surface-muted'>
                  {auction.primaryImage ? (
                    <Image
                      src={auction.primaryImage.url}
                      alt={auction.primaryImage.altText ?? auction.title}
                      fill
                      sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
                      className='object-cover'
                    />
                  ) : (
                    <div className='flex h-full items-center justify-center px-6 text-center text-sm text-muted'>
                      No image uploaded
                    </div>
                  )}
                </div>

                <div className='p-5'>
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <p className='text-xs font-bold tracking-wider text-primary uppercase'>
                        {auction.category.name}
                      </p>

                      <h2 className='mt-2 line-clamp-2 text-xl font-extrabold text-foreground'>
                        {auction.title}
                      </h2>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusClasses[auction.status]}`}
                    >
                      {statusLabels[auction.status]}
                    </span>
                  </div>

                  <div className='mt-5 border-t border-border pt-4'>
                    <p className='text-xs font-bold tracking-wider text-muted uppercase'>
                      Current price
                    </p>

                    <p className='mt-1 font-mono text-lg font-bold text-foreground'>
                      {formatMoney(auction.currentPrice, auction.currency)}
                    </p>

                    <p className='mt-3 text-sm text-muted'>
                      Updated {formatDateTime(auction.updatedAt)}
                    </p>
                  </div>

                  <div className='mt-5 flex flex-col gap-3'>
                    {destination && (
                      <Link
                        href={destination}
                        className='inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-black text-background transition hover:bg-primary-strong'
                      >
                        {auction.status === 'DRAFT'
                          ? 'Continue draft'
                          : 'View auction'}
                      </Link>
                    )}

                    {auction.status === 'DRAFT' && (
                      <button
                        type='button'
                        className='min-h-10 rounded-full border border-danger/40 px-5 text-sm font-bold text-danger transition hover:bg-danger hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          deleteDraft(auction.id, auction.title);
                        }}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete draft'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
