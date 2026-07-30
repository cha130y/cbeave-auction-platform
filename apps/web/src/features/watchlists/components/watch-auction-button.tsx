'use client';

import { useAuth } from '@/features/auth/use-auth';
import {
  useUnwatchAuction,
  useWatchAuction,
  useWatchlist,
} from '@/features/watchlists/queries/watchlist.queries';
import { cn } from '@/lib/utils/cn';
import Link from 'next/link';

type WatchAuctionButtonProps = {
  auctionId: string;
  className?: string;
};

export function WatchAuctionButton({
  auctionId,
  className,
}: WatchAuctionButtonProps) {
  const { status } = useAuth();
  const isAuthenticated = status === 'authenticated';

  const watchlistQuery = useWatchlist(
    {
      limit: 50,
    },
    isAuthenticated,
  );

  const watchMutation = useWatchAuction();
  const unwatchMutation = useUnwatchAuction();

  const isWatched =
    watchlistQuery.data?.items.some((item) => item.auction.id === auctionId) ??
    false;

  const isChanging = watchMutation.isPending || unwatchMutation.isPending;

  const mutationError = watchMutation.error ?? unwatchMutation.error;

  async function handleToggle() {
    try {
      if (isWatched) {
        await unwatchMutation.mutateAsync(auctionId);
      } else {
        await watchMutation.mutateAsync(auctionId);
      }
    } catch {
      // Mutation errors are rendered below the button.
    }
  }

  if (status === 'unauthenticated') {
    return (
      <Link
        href='/auth'
        className={cn(
          'inline-flex min-h-10 items-center justify-center rounded-full border border-border px-5 text-sm font-bold text-foreground transition hover:border-primary/50 hover:text-primary',
          className,
        )}
      >
        Log in to watch
      </Link>
    );
  }

  if (status === 'loading' || watchlistQuery.isPending) {
    return (
      <button
        type='button'
        className={cn(
          'min-h-10 rounded-full border border-border px-5 text-sm font-bold text-muted opacity-60',
          className,
        )}
        disabled
      >
        Checking watchlist...
      </button>
    );
  }

  if (watchlistQuery.isError) {
    return (
      <button
        type='button'
        className={cn(
          'min-h-10 rounded-full border border-border px-5 text-sm font-bold text-muted opacity-60',
          className,
        )}
        disabled
      >
        Watchlist unavailable
      </button>
    );
  }

  return (
    <div className={cn('flex flex-col items-start gap-2', className)}>
      <button
        type='button'
        aria-pressed={isWatched}
        className={cn(
          'min-h-10 rounded-full border px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60',
          isWatched
            ? 'border-primary bg-primary text-background hover:bg-primary-strong'
            : 'border-border text-foreground hover:border-primary/50 hover:text-primary',
        )}
        disabled={isChanging}
        onClick={handleToggle}
      >
        {isChanging ? 'Updating...' : isWatched ? 'Watching' : 'Watch auction'}
      </button>

      {mutationError && (
        <p className='text-xs text-danger' role='alert'>
          {mutationError instanceof Error
            ? mutationError.message
            : 'The watchlist could not be updated.'}
        </p>
      )}
    </div>
  );
}
