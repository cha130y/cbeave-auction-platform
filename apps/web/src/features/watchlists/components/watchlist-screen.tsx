'use client';

import { AuctionCard } from '@/features/auctions/components/auction-card';
import { useAuth } from '@/features/auth/use-auth';
import {
  useInfiniteWatchlist,
  useUnwatchAuction,
} from '@/features/watchlists/queries/watchlist.queries';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function WatchlistScreen() {
  const router = useRouter();
  const { status } = useAuth();

  const watchlistQuery = useInfiniteWatchlist(12, status === 'authenticated');

  const unwatchMutation = useUnwatchAuction();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth');
    }
  }, [router, status]);

  if (status !== 'authenticated' || watchlistQuery.isPending) {
    return (
      <div className='mx-auto w-full max-w-360 px-4 py-16 sm:px-6 lg:px-8'>
        <div className='h-120 animate-pulse rounded-3xl border border-border bg-surface' />
      </div>
    );
  }

  if (watchlistQuery.isError) {
    return (
      <section className='mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6'>
        <h1 className='text-3xl font-black text-foreground'>
          Watchlist could not be loaded
        </h1>

        <p className='mt-3 text-muted'>
          Please refresh the page or try again later.
        </p>
      </section>
    );
  }

  const items = watchlistQuery.data.pages.flatMap((page) => page.items);

  return (
    <section className='mx-auto w-full max-w-360 px-4 py-10 sm:px-6 sm:py-16 lg:px-8'>
      <div>
        <p className='text-xs font-black tracking-[0.22em] text-primary uppercase'>
          Saved auctions
        </p>

        <h1 className='mt-3 text-4xl font-black tracking-tight text-foreground sm:text-5xl'>
          Your watchlist
        </h1>

        <p className='mt-3 text-base leading-7 text-muted'>
          Keep track of auctions you want to revisit.
        </p>
      </div>

      {items.length === 0 ? (
        <div className='mt-10 rounded-3xl border border-dashed border-border px-6 py-16 text-center'>
          <h2 className='text-xl font-extrabold text-foreground'>
            Your watchlist is empty
          </h2>

          <p className='mt-2 text-muted'>
            Open an auction and select Watch auction to save it here.
          </p>
        </div>
      ) : (
        <>
          {unwatchMutation.isError && (
            <div
              className='mt-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger'
              role='alert'
            >
              {unwatchMutation.error instanceof Error
                ? unwatchMutation.error.message
                : 'The auction could not be removed from your watchlist.'}
            </div>
          )}
          <div className='mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {items.map((item) => {
              const isRemoving =
                unwatchMutation.isPending &&
                unwatchMutation.variables === item.auction.id;

              return (
                <div key={item.auction.id} className='space-y-3'>
                  <AuctionCard auction={item.auction} />

                  <button
                    type='button'
                    className='min-h-10 w-full rounded-full border border-border px-5 text-sm font-bold text-muted transition hover:border-danger/50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50'
                    disabled={unwatchMutation.isPending}
                    onClick={() => {
                      unwatchMutation.mutate(item.auction.id);
                    }}
                  >
                    {isRemoving ? 'Removing...' : 'Remove from watchlist'}
                  </button>
                </div>
              );
            })}
          </div>

          {watchlistQuery.hasNextPage && (
            <div className='mt-10 flex justify-center'>
              <button
                type='button'
                className='min-h-11 rounded-full border border-border px-6 text-sm font-black text-foreground transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
                disabled={watchlistQuery.isFetchingNextPage}
                onClick={() => {
                  void watchlistQuery.fetchNextPage();
                }}
              >
                {watchlistQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
