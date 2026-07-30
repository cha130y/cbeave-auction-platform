'use client';

import { publishAuction } from '@/features/auctions/api/auctions.api';
import { AuctionImageManager } from '@/features/auctions/components/auction-image-manager';
import { useOwnedAuctionDraft } from '@/features/auctions/queries/auction.queries';
import { useAuth } from '@/features/auth/use-auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type AuctionDraftScreenProps = {
  auctionId: string;
};

function formatMoney(amount: string, currency: string): string {
  //Intl is JavaScript’s built-in internationalization API. It formats values according to locale and regional conventions.
  //formatMoney('1234.5', 'THB') ==> "฿1,234.50"
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(amount));
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AuctionDraftScreen({ auctionId }: AuctionDraftScreenProps) {
  const router = useRouter();
  const { status } = useAuth();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const draftQuery = useOwnedAuctionDraft(
    status === 'authenticated' ? auctionId : '',
  );

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth');
    }
  }, [router, status]);

  if (status !== 'authenticated' || draftQuery.isPending) {
    return (
      <div className='mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8'>
        <div className='h-120 animate-pulse rounded-3xl border border-border bg-surface' />
      </div>
    );
  }

  if (draftQuery.isError) {
    return (
      <div className='mx-auto max-w-3xl px-4 py-20 text-center sm:px-6'>
        <h1 className='text-3xl font-black text-foreground'>
          Auction draft could not be loaded
        </h1>

        <p className='mt-3 text-muted'>
          The draft may not exist or may belong to another seller.
        </p>

        <Link
          href='/sell'
          className='mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-bold text-background'
        >
          Create an auction
        </Link>
      </div>
    );
  }

  const draft = draftQuery.data;
  const hasImages = draft.images.length > 0;
  const hasSchedule = Boolean(draft.scheduledStartAt && draft.currentEndAt);
  const canPublish = hasImages && hasSchedule;

  async function handlePublish() {
    if (!canPublish) {
      return;
    }

    const confirmed = window.confirm(
      'Publish this auction? Its details and images can no longer be edited as a draft.',
    );

    if (!confirmed) {
      return;
    }

    setPublishError(null);
    setIsPublishing(true);

    try {
      const publishedAuction = await publishAuction(draft.id);

      router.push(`/auctions/${publishedAuction.id}`);
    } catch (error) {
      setPublishError(
        error instanceof Error
          ? error.message
          : 'The auction could not be published.',
      );
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <section className='mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8'>
      <Link
        href='/sell'
        className='text-sm font-bold text-muted transition hover:text-primary'
      >
        ← Create another auction
      </Link>

      <div className='mt-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-black tracking-[0.22em] text-primary uppercase'>
            Seller workspace
          </p>

          <h1 className='mt-3 text-4xl font-black tracking-tight text-foreground sm:text-5xl'>
            {draft.title}
          </h1>

          <p className='mt-3 text-muted'>
            {draft.category.name} · Last updated {formatDate(draft.updatedAt)}
          </p>
        </div>

        <div className='flex items-center gap-3'>
          <Link
            href={`/sell/${draft.id}/edit`}
            className='inline-flex min-h-10 items-center rounded-full bg-primary px-5 text-sm font-black text-background transition hover:bg-primary-strong'
          >
            Edit details
          </Link>

          <span className='w-fit rounded-full bg-warning/10 px-4 py-2 text-xs font-black tracking-wider text-warning uppercase'>
            {draft.status}
          </span>
        </div>
      </div>

      <div className='mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]'>
        <div className='rounded-3xl border border-border bg-surface p-6 sm:p-8'>
          <h2 className='text-xl font-extrabold text-foreground'>
            Auction details
          </h2>

          <p className='mt-4 leading-7 whitespace-pre-line text-muted'>
            {draft.description}
          </p>

          <div className='mt-8 border-t border-border pt-6'>
            <h2 className='text-xl font-extrabold text-foreground'>
              Auction images
            </h2>

            <p className='mt-2 text-sm text-muted'>
              Upload up to five images. The first image becomes the primary
              image.
            </p>

            <AuctionImageManager auctionId={draft.id} images={draft.images} />
          </div>
        </div>

        <aside className='space-y-6'>
          <div className='rounded-3xl border border-border bg-surface p-6'>
            <h2 className='text-lg font-extrabold text-foreground'>Pricing</h2>

            <dl className='mt-5 space-y-4 text-sm'>
              <div>
                <dt className='text-muted'>Starting price</dt>
                <dd className='mt-1 font-mono text-xl font-bold text-primary'>
                  {formatMoney(draft.startingPrice, draft.currency)}
                </dd>
              </div>

              <div>
                <dt className='text-muted'>Reserve price</dt>
                <dd className='mt-1 font-bold text-foreground'>
                  {draft.reservePrice
                    ? formatMoney(draft.reservePrice, draft.currency)
                    : 'No reserve'}
                </dd>
              </div>

              <div>
                <dt className='text-muted'>Minimum increment</dt>
                <dd className='mt-1 font-bold text-foreground'>
                  {formatMoney(draft.minBidIncrement, draft.currency)}
                </dd>
              </div>
            </dl>
          </div>

          <div className='rounded-3xl border border-border bg-surface p-6'>
            <h2 className='text-lg font-extrabold text-foreground'>Schedule</h2>

            <dl className='mt-5 space-y-4 text-sm'>
              <div>
                <dt className='text-muted'>Starts</dt>
                <dd className='mt-1 font-bold text-foreground'>
                  {formatDate(draft.scheduledStartAt)}
                </dd>
              </div>

              <div>
                <dt className='text-muted'>Ends</dt>
                <dd className='mt-1 font-bold text-foreground'>
                  {formatDate(draft.currentEndAt)}
                </dd>
              </div>
            </dl>
          </div>
        </aside>

        <div className='rounded-3xl border border-border bg-surface p-6'>
          <h2 className='text-lg font-extrabold text-foreground'>
            Publication
          </h2>

          <p className='mt-2 text-sm leading-6 text-muted'>
            Complete the required preparation before making this auction public.
          </p>

          <ul className='mt-5 space-y-3 text-sm'>
            <li
              className={
                hasImages ? 'font-bold text-success' : 'font-bold text-danger'
              }
            >
              {hasImages ? '✓' : '×'} At least one image
            </li>

            <li
              className={
                hasSchedule ? 'font-bold text-success' : 'font-bold text-danger'
              }
            >
              {hasSchedule ? '✓' : '×'} Start and end schedule
            </li>
          </ul>

          {publishError && (
            <div
              className='mt-5 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger'
              role='alert'
            >
              {publishError}
            </div>
          )}

          {!hasSchedule && (
            <div className='mt-5 rounded-2xl border border-danger/30 bg-danger/5 p-4'>
              <p className='text-sm font-bold text-foreground'>
                Auction schedule required
              </p>

              <p className='mt-1 text-xs leading-5 text-muted'>
                Choose the start and end times before publishing this auction.
              </p>

              <Link
                href={`/sell/${draft.id}/edit`}
                className='mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-full border border-primary/40 bg-primary/10 px-5 text-sm font-black text-primary transition hover:border-primary hover:bg-primary hover:text-background'
              >
                Set start and end times
                <span className='ml-2' aria-hidden='true'>
                  →
                </span>
              </Link>
            </div>
          )}

          <button
            type='button'
            className='mt-6 min-h-11 w-full rounded-full bg-primary px-5 text-sm font-black text-background transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-50'
            disabled={!canPublish || isPublishing}
            onClick={handlePublish}
          >
            {isPublishing ? 'Publishing...' : 'Publish auction'}
          </button>

          {!canPublish && (
            <p className='mt-3 text-xs leading-5 text-muted'>
              Publication becomes available after all requirements are complete.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
