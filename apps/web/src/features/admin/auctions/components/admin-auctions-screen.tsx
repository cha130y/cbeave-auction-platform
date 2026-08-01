'use client';

import { AdminAuctionCancellationForm } from '@/features/admin/auctions/components/admin-auction-cancellation-form';
import { useInfiniteAdminAuctions } from '@/features/admin/auctions/queries/admin-auction.queries';
import type {
  AdminAuction,
  AdminAuctionStatus,
} from '@/features/admin/auctions/schemas/admin-auction.schemas';
import { useAuth } from '@/features/auth/use-auth';
import {
  formatDateTime,
  formatMoney,
  formatOptionalDateTime,
} from '@/lib/formatters';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type StatusFilter = 'ALL' | AdminAuctionStatus;

const statusClassNames: Record<AdminAuctionStatus, string> = {
  DRAFT: 'border-border bg-surface-muted text-muted',
  SCHEDULED: 'border-primary/30 bg-primary/10 text-primary',
  ACTIVE: 'border-danger/30 bg-danger/10 text-danger',
  SOLD: 'border-success/30 bg-success/10 text-success',
  UNSOLD: 'border-border bg-surface-muted text-muted',
  CANCELLED: 'border-danger/30 bg-danger/10 text-danger',
};

const publiclyVisibleStatuses: AdminAuctionStatus[] = [
  'SCHEDULED',
  'ACTIVE',
  'SOLD',
  'UNSOLD',
];

export function AdminAuctionsScreen() {
  const router = useRouter();
  const { status, user } = useAuth();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedAuction, setSelectedAuction] = useState<AdminAuction | null>(
    null,
  );

  const cancellationFormRef = useRef<HTMLDivElement>(null);

  const isAdmin = status === 'authenticated' && user?.role === 'ADMIN';

  const auctionsQuery = useInfiniteAdminAuctions(
    {
      limit: 20,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    },
    isAdmin,
  );

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
    if (!selectedAuction) {
      return;
    }

    cancellationFormRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [selectedAuction]);

  if (!isAdmin) {
    return (
      <div className='mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8'>
        <div className='h-96 animate-pulse rounded-3xl border border-border bg-surface' />
      </div>
    );
  }

  const auctions =
    auctionsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section className='mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8'>
      <div className='flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-black tracking-[0.22em] text-primary uppercase'>
            Administration
          </p>

          <h1 className='mt-3 text-3xl font-black tracking-tight text-foreground sm:text-5xl'>
            Auction management
          </h1>

          <p className='mt-3 text-base leading-7 text-muted'>
            Review marketplace auctions and cancel scheduled or active listings.
          </p>
        </div>

        <label className='block w-full sm:w-52'>
          <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
            Auction status
          </span>

          <select
            value={statusFilter}
            className='h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none transition focus:border-primary/70'
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setSelectedAuction(null);
            }}
          >
            <option value='ALL'>All statuses</option>
            <option value='DRAFT'>Draft</option>
            <option value='SCHEDULED'>Scheduled</option>
            <option value='ACTIVE'>Active</option>
            <option value='SOLD'>Sold</option>
            <option value='UNSOLD'>Unsold</option>
            <option value='CANCELLED'>Cancelled</option>
          </select>
        </label>
      </div>

      {selectedAuction && (
        <div ref={cancellationFormRef} className='mt-10 scroll-mt-24'>
          <AdminAuctionCancellationForm
            key={selectedAuction.id}
            auction={selectedAuction}
            onCancel={() => {
              setSelectedAuction(null);
            }}
            onSuccess={() => {
              setSelectedAuction(null);
            }}
          />
        </div>
      )}

      {auctionsQuery.isPending && (
        <div className='mt-10 h-80 animate-pulse rounded-3xl border border-border bg-surface' />
      )}

      {auctionsQuery.isError && (
        <div
          role='alert'
          className='mt-10 rounded-2xl border border-danger/30 bg-danger/5 px-5 py-4 text-danger'
        >
          Auctions could not be loaded. Please try again.
        </div>
      )}

      {auctionsQuery.isSuccess && auctions.length === 0 && (
        <div className='mt-10 rounded-3xl border border-dashed border-border px-6 py-16 text-center'>
          <h2 className='text-xl font-extrabold text-foreground'>
            No matching auctions
          </h2>

          <p className='mt-2 text-muted'>
            No auctions match the selected status.
          </p>
        </div>
      )}

      {auctions.length > 0 && (
        <div className='mt-10 grid gap-4 lg:grid-cols-2'>
          {auctions.map((auction) => {
            const canCancel =
              auction.status === 'SCHEDULED' || auction.status === 'ACTIVE';

            const isPubliclyVisible = publiclyVisibleStatuses.includes(
              auction.status,
            );

            return (
              <article
                key={auction.id}
                className='rounded-2xl border border-border bg-surface p-5 sm:p-6'
              >
                <div className='flex items-start justify-between gap-4'>
                  <div className='min-w-0'>
                    <p className='text-xs font-bold tracking-wider text-primary uppercase'>
                      {auction.category.name}
                    </p>

                    <h2 className='mt-2 truncate text-xl font-black text-foreground'>
                      {auction.title}
                    </h2>

                    <p className='mt-1 truncate text-sm text-muted'>
                      {auction.seller.displayName} · {auction.seller.email}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${
                      statusClassNames[auction.status]
                    }`}
                  >
                    {auction.status}
                  </span>
                </div>

                <dl className='mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2'>
                  <div>
                    <dt className='text-xs font-bold tracking-wider text-muted uppercase'>
                      Current price
                    </dt>

                    <dd className='mt-1 text-lg font-black text-foreground'>
                      {formatMoney(auction.currentPrice, auction.currency)}
                    </dd>
                  </div>

                  <div>
                    <dt className='text-xs font-bold tracking-wider text-muted uppercase'>
                      Accepted bids
                    </dt>

                    <dd className='mt-1 text-lg font-black text-foreground'>
                      {auction.bidCount}
                    </dd>
                  </div>

                  <div>
                    <dt className='text-xs font-bold tracking-wider text-muted uppercase'>
                      Scheduled start
                    </dt>

                    <dd className='mt-1 text-sm text-foreground'>
                      {formatOptionalDateTime(auction.scheduledStartAt)}
                    </dd>
                  </div>

                  <div>
                    <dt className='text-xs font-bold tracking-wider text-muted uppercase'>
                      Current deadline
                    </dt>

                    <dd className='mt-1 text-sm text-foreground'>
                      {formatOptionalDateTime(auction.currentEndAt)}
                    </dd>
                  </div>

                  <div>
                    <dt className='text-xs font-bold tracking-wider text-muted uppercase'>
                      Created
                    </dt>

                    <dd className='mt-1 text-sm text-foreground'>
                      {formatDateTime(auction.createdAt)}
                    </dd>
                  </div>

                  <div>
                    <dt className='text-xs font-bold tracking-wider text-muted uppercase'>
                      Updated
                    </dt>

                    <dd className='mt-1 text-sm text-foreground'>
                      {formatDateTime(auction.updatedAt)}
                    </dd>
                  </div>
                </dl>

                {auction.status === 'CANCELLED' &&
                  auction.cancellationReason && (
                    <div className='mt-5 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3'>
                      <p className='text-xs font-bold tracking-wider text-danger uppercase'>
                        Cancellation reason
                      </p>

                      <p className='mt-1 text-sm text-muted'>
                        {auction.cancellationReason}
                      </p>
                    </div>
                  )}

                <div className='mt-5 flex flex-wrap justify-end gap-3 border-t border-border pt-5'>
                  {isPubliclyVisible && (
                    <Link
                      href={`/auctions/${auction.id}`}
                      className='inline-flex min-h-10 items-center justify-center rounded-full border border-border px-4 text-sm font-bold text-foreground transition hover:border-primary/60 hover:text-primary'
                    >
                      View auction
                    </Link>
                  )}

                  {canCancel && (
                    <button
                      type='button'
                      className='min-h-10 rounded-full border border-danger/40 px-4 text-sm font-bold text-danger transition hover:bg-danger/10'
                      onClick={() => {
                        setSelectedAuction(auction);
                      }}
                    >
                      Cancel auction
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {auctionsQuery.hasNextPage && (
        <div className='mt-10 flex justify-center'>
          <button
            type='button'
            disabled={auctionsQuery.isFetchingNextPage}
            className='min-h-11 rounded-full border border-border px-6 text-sm font-black text-foreground transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
            onClick={() => {
              void auctionsQuery.fetchNextPage();
            }}
          >
            {auctionsQuery.isFetchingNextPage
              ? 'Loading auctions...'
              : 'Load more auctions'}
          </button>
        </div>
      )}
    </section>
  );
}
