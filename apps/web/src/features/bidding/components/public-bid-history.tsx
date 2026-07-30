'use client';

import { useInfinitePublicBids } from '@/features/bidding/queries/bidding.queries';
import { formatDateTime, formatMoney } from '@/lib/formatters';

type PublicBidHistoryProps = {
  auctionId: string;
  currency: string;
};

export function PublicBidHistory({
  auctionId,
  currency,
}: PublicBidHistoryProps) {
  const bidHistoryQuery = useInfinitePublicBids(auctionId, 20);

  if (bidHistoryQuery.isPending) {
    return (
      <div className='mt-5 space-y-3'>
        <div className='h-16 animate-pulse rounded-2xl bg-surface-muted' />
        <div className='h-16 animate-pulse rounded-2xl bg-surface-muted' />
      </div>
    );
  }

  if (bidHistoryQuery.isError) {
    return (
      <div
        className='mt-5 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger'
        role='alert'
      >
        Bid history could not be loaded.
      </div>
    );
  }

  const bids = bidHistoryQuery.data.pages.flatMap((page) => page.items);

  if (bids.length === 0) {
    return (
      <div className='mt-5 rounded-2xl border border-dashed border-border px-5 py-8 text-center'>
        <p className='font-bold text-foreground'>No bids yet</p>

        <p className='mt-1 text-sm text-muted'>
          Accepted bids will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className='mt-5'>
      <ol className='divide-y divide-border overflow-hidden rounded-2xl border border-border'>
        {bids.map((bid) => (
          <li
            key={bid.sequenceNo}
            className='flex items-center justify-between gap-4 bg-background px-4 py-4'
          >
            <div className='min-w-0'>
              <p className='truncate text-sm font-bold text-foreground'>
                {bid.bidderDisplayName}
              </p>

              <p className='mt-1 text-xs text-muted'>
                Bid #{bid.sequenceNo} · {formatDateTime(bid.placedAt)}
              </p>
            </div>

            <p className='shrink-0 font-mono text-sm font-bold text-primary'>
              {formatMoney(bid.amount, currency)}
            </p>
          </li>
        ))}
      </ol>

      {bidHistoryQuery.hasNextPage && (
        <div className='mt-5 flex justify-center'>
          <button
            type='button'
            className='min-h-10 rounded-full border border-border px-5 text-sm font-bold text-foreground transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
            disabled={bidHistoryQuery.isFetchingNextPage}
            onClick={() => {
              void bidHistoryQuery.fetchNextPage();
            }}
          >
            {bidHistoryQuery.isFetchingNextPage
              ? 'Loading...'
              : 'Load more bids'}
          </button>
        </div>
      )}
    </div>
  );
}
