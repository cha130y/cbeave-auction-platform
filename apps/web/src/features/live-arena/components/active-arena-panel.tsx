'use client';

import type { PublicAuctionDetail } from '@/features/auctions/schemas/auction.schemas';
import { PlaceBidForm } from '@/features/bidding/components/place-bid-form';
import { useCountdown } from '@/features/live-arena/hooks/use-countdown';
import { useActiveArenaState } from '@/features/live-arena/realtime/use-active-arena-state';
import { formatDateTime, formatMoney } from '@/lib/formatters';

type ActiveArenaPanelProps = {
  auction: PublicAuctionDetail;
  enabled: boolean;
};

const countdownUnits = [
  ['days', 'Days'],
  ['hours', 'Hours'],
  ['minutes', 'Minutes'],
  ['seconds', 'Seconds'],
] as const;

export function ActiveArenaPanel({ auction, enabled }: ActiveArenaPanelProps) {
  const { arenaState, errorMessage, latestExtension, status } =
    useActiveArenaState(auction.id, enabled);
  const currentEndAt = arenaState?.currentEndAt ?? '1970-01-01T00:00:00.000Z';

  const countdown = useCountdown(currentEndAt);

  if (!enabled || status === 'idle' || status === 'loading') {
    return (
      <div className='mt-8 space-y-4'>
        <div className='h-28 animate-pulse rounded-2xl bg-surface-muted' />
        <div className='h-48 animate-pulse rounded-2xl bg-surface-muted' />
      </div>
    );
  }

  if (status === 'error' || !arenaState) {
    return (
      <div
        className='mt-8 rounded-2xl border border-danger/30 bg-danger/5 p-5 text-danger'
        role='alert'
      >
        <p className='font-bold'>Active Arena unavailable</p>

        <p className='mt-1 text-sm'>
          {errorMessage ?? 'The active auction state could not be loaded.'}
        </p>
      </div>
    );
  }

  const liveAuction = {
    ...auction,
    status: 'ACTIVE' as const,
    currentPrice: arenaState.currentPrice,
  };

  return (
    <div className='mt-8 space-y-6'>
      {latestExtension && (
        <section
          className='rounded-2xl border border-primary/40 bg-primary/10 p-5'
          role='status'
          aria-live='polite'
        >
          <p className='text-xs font-black tracking-wider text-primary uppercase'>
            Sudden-death extension #{latestExtension.extensionNumber}
          </p>

          <h2 className='mt-2 text-xl font-black text-foreground'>
            Auction extended by {latestExtension.extensionSeconds} seconds
          </h2>

          <p className='mt-2 text-sm leading-6 text-muted'>
            Bid #{latestExtension.triggeringBid.sequenceNo} at{' '}
            <span className='font-bold text-foreground'>
              {formatMoney(
                latestExtension.triggeringBid.amount,
                arenaState.currency,
              )}
            </span>{' '}
            moved the deadline from{' '}
            <span className='font-bold text-foreground'>
              {formatDateTime(latestExtension.previousEndAt)}
            </span>{' '}
            to{' '}
            <span className='font-bold text-foreground'>
              {formatDateTime(latestExtension.newEndAt)}
            </span>
            .
          </p>
        </section>
      )}
      <section className='rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6'>
        <div className='flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <p className='text-xs font-black tracking-wider text-muted uppercase'>
              Current bid
            </p>

            <p className='mt-2 font-mono text-4xl font-black text-primary'>
              {formatMoney(arenaState.currentPrice, arenaState.currency)}
            </p>

            <p className='mt-2 text-sm text-muted'>
              Minimum next bid:{' '}
              <span className='font-bold text-foreground'>
                {formatMoney(arenaState.minimumNextBid, arenaState.currency)}
              </span>
            </p>
          </div>

          <div className='sm:text-right'>
            <p className='text-xs font-black tracking-wider text-muted uppercase'>
              Current leader
            </p>

            <p className='mt-2 font-bold text-foreground'>
              {arenaState.leader?.bidderDisplayName ?? 'No leader yet'}
            </p>

            {arenaState.leader && (
              <p className='mt-1 font-mono text-sm text-primary'>
                {formatMoney(arenaState.leader.amount, arenaState.currency)}
              </p>
            )}
          </div>
        </div>

        <div className='mt-6 border-t border-primary/15 pt-5'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <p className='text-xs font-black tracking-wider text-muted uppercase'>
              Time remaining
            </p>

            <p className='text-xs text-muted'>
              Deadline: {formatDateTime(arenaState.currentEndAt)}
            </p>
          </div>

          <div className='mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {countdownUnits.map(([key, label]) => (
              <div
                key={key}
                className='rounded-xl bg-background/70 p-3 text-center'
              >
                <p className='font-mono text-2xl font-black text-primary'>
                  {countdown.isReady
                    ? String(countdown[key]).padStart(2, '0')
                    : '--'}
                </p>

                <p className='mt-1 text-[0.65rem] font-bold tracking-wider text-muted uppercase'>
                  {label}
                </p>
              </div>
            ))}
          </div>

          {countdown.isComplete && (
            <p className='mt-3 text-sm font-bold text-danger'>
              Waiting for the server to finalize the auction.
            </p>
          )}
        </div>
      </section>

      <div className='grid gap-3 sm:grid-cols-3'>
        <div className='rounded-2xl bg-surface-muted p-4'>
          <p className='text-xs font-black tracking-wider text-muted uppercase'>
            Bids
          </p>

          <p className='mt-2 font-mono text-2xl font-black text-foreground'>
            {arenaState.bidCount}
          </p>
        </div>

        <div className='rounded-2xl bg-surface-muted p-4'>
          <p className='text-xs font-black tracking-wider text-muted uppercase'>
            Reserve
          </p>

          <p className='mt-2 font-bold text-foreground'>
            {arenaState.reserveMet ? 'Met' : 'Not met'}
          </p>
        </div>

        <div className='rounded-2xl bg-surface-muted p-4'>
          <p className='text-xs font-black tracking-wider text-muted uppercase'>
            Extensions
          </p>

          <p className='mt-2 font-mono text-2xl font-black text-foreground'>
            {arenaState.extensionCount}
          </p>
        </div>
      </div>

      <PlaceBidForm
        auction={liveAuction}
        minimumNextBid={arenaState.minimumNextBid}
        canBid={arenaState.canBid}
      />
      <section>
        <h2 className='text-xl font-black text-foreground'>Live activity</h2>

        <p className='mt-1 text-sm text-muted'>
          Accepted bids appear here with the newest activity first.
        </p>

        {arenaState.recentBids.length === 0 ? (
          <div className='mt-4 rounded-2xl border border-dashed border-border px-5 py-8 text-center'>
            <p className='font-bold text-foreground'>No live activity yet</p>

            <p className='mt-1 text-sm text-muted'>
              The first accepted bid will appear here.
            </p>
          </div>
        ) : (
          <ol className='mt-4 space-y-3'>
            {[...arenaState.recentBids].reverse().map((bid) => (
              <li
                key={bid.sequenceNo}
                className='flex items-start gap-4 rounded-2xl border border-border bg-background p-4'
              >
                <div
                  className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono font-bold text-primary'
                  aria-hidden='true'
                >
                  $
                </div>

                <div className='min-w-0 flex-1'>
                  <p className='text-sm text-foreground'>
                    <span className='font-bold'>{bid.bidderDisplayName}</span>{' '}
                    placed a bid
                  </p>

                  <p className='mt-1 font-mono text-lg font-black text-primary'>
                    {formatMoney(bid.amount, arenaState.currency)}
                  </p>

                  <p className='mt-1 text-xs text-muted'>
                    Bid #{bid.sequenceNo} · {formatDateTime(bid.placedAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
