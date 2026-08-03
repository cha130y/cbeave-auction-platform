'use client';

import { usePublicAuction } from '@/features/auctions/queries/auction.queries';
import { useAuth } from '@/features/auth/use-auth';
import { ActiveArenaPanel } from '@/features/live-arena/components/active-arena-panel';
import { useCountdown } from '@/features/live-arena/hooks/use-countdown';
import { useAuctionLobby } from '@/features/live-arena/realtime/use-auction-lobby';
import { formatDateTime } from '@/lib/formatters';
import { AuctionResultPanel } from '@/features/live-arena/components/auction-result-panel';
import type { AuctionEndedEvent } from '@/features/live-arena/schemas/live-arena.schemas';
import Link from 'next/link';
import { maskBidderDisplayName } from '@/lib/display-names';
import Image from 'next/image';
import { useEffect } from 'react';

type AuctionLobbyScreenProps = {
  auctionId: string;
};

const countdownUnits = [
  ['days', 'Days'],
  ['hours', 'Hours'],
  ['minutes', 'Minutes'],
  ['seconds', 'Seconds'],
] as const;

export function AuctionLobbyScreen({ auctionId }: AuctionLobbyScreenProps) {
  const { status: authStatus } = useAuth();
  const auctionQuery = usePublicAuction(auctionId);

  const auction = auctionQuery.data;
  const scheduledStartAt =
    auction?.scheduledStartAt ?? '1970-01-01T00:00:00.000Z';

  const countdown = useCountdown(scheduledStartAt);

  const canJoinLobby =
    authStatus === 'authenticated' &&
    (auction?.status === 'SCHEDULED' || auction?.status === 'ACTIVE');

  const {
    connectionStatus,
    endedEvent,
    errorMessage,
    participantCount,
    startedEvent,
  } = useAuctionLobby(auctionId, canJoinLobby);

  const refetchAuction = auctionQuery.refetch;

  useEffect(() => {
    if (auction?.status !== 'SCHEDULED' || !countdown.isComplete) {
      return;
    }

    void refetchAuction();

    const refreshTimer = window.setInterval(() => {
      void refetchAuction();
    }, 2_000);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [auction?.status, countdown.isComplete, refetchAuction]);

  if (authStatus === 'loading' || auctionQuery.isPending) {
    return (
      <main className='mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8'>
        <div className='h-120 animate-pulse rounded-3xl bg-surface' />
      </main>
    );
  }

  if (auctionQuery.isError || !auction) {
    return (
      <main className='mx-auto w-full max-w-3xl px-4 py-20 text-center'>
        <h1 className='text-3xl font-black text-foreground'>
          Auction lobby unavailable
        </h1>

        <p className='mt-3 text-muted'>
          The auction may not exist or may not be publicly available.
        </p>

        <Link
          href='/'
          className='mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-bold text-background'
        >
          Return to marketplace
        </Link>
      </main>
    );
  }

  if (authStatus === 'unauthenticated') {
    return (
      <main className='mx-auto w-full max-w-3xl px-4 py-20 text-center'>
        <p className='text-xs font-black tracking-[0.22em] text-primary uppercase'>
          Live Arena
        </p>

        <h1 className='mt-4 text-4xl font-black text-foreground'>
          Sign in to join the lobby
        </h1>

        <p className='mx-auto mt-4 max-w-xl leading-7 text-muted'>
          Lobby participation and live bidding require an authenticated account.
        </p>

        <Link
          href='/auth'
          className='mt-7 inline-flex min-h-12 items-center rounded-full bg-primary px-7 font-bold text-background'
        >
          Log in or register
        </Link>
      </main>
    );
  }

  const persistedResult: AuctionEndedEvent | null =
    (auction.status === 'SOLD' || auction.status === 'UNSOLD') &&
    auction.endedAt
      ? {
          auctionId: auction.id,
          status: auction.status,
          currency: auction.currency,
          finalPrice: auction.soldPrice ?? auction.currentPrice,
          bidCount: auction.bidCount,
          reserveMet: auction.reserveMet,
          endedAt: auction.endedAt,
          winnerDisplayName: auction.winner
            ? maskBidderDisplayName(auction.winner.displayName)
            : null,
        }
      : null;

  const auctionResult = endedEvent ?? persistedResult;

  if (auctionResult) {
    return (
      <main className='mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8'>
        <Link
          href={`/auctions/${auction.id}`}
          className='text-sm font-bold text-muted transition hover:text-primary'
        >
          ← Back to auction
        </Link>

        <section className='mt-7 rounded-3xl border border-border bg-surface p-6 sm:p-10'>
          <div className='text-center'>
            <p className='text-xs font-black tracking-[0.22em] text-primary uppercase'>
              Live Arena result
            </p>

            <h1 className='mt-4 text-4xl font-black text-foreground sm:text-5xl'>
              {auction.title}
            </h1>

            <p className='mt-3 text-muted'>
              {auction.category.name} · Listed by{' '}
              <span className='font-bold text-foreground'>
                {auction.seller.displayName}
              </span>
            </p>
          </div>

          <AuctionResultPanel result={auctionResult} />
        </section>
      </main>
    );
  }
  const hasStarted = auction.status === 'ACTIVE' || startedEvent !== null;
  const primaryImage =
    auction.images.find((image) => image.isPrimary) ?? auction.images[0];

  return (
    <main className='mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8'>
      <Link
        href={`/auctions/${auction.id}`}
        className='text-sm font-bold text-muted transition hover:text-primary'
      >
        ← Back to auction
      </Link>

      <section className='mt-7 overflow-hidden rounded-3xl border border-border bg-surface'>
        <div className='grid border-b border-border lg:grid-cols-[20rem_1fr]'>
          <div className='relative min-h-56 overflow-hidden bg-background lg:min-h-72'>
            <Image
              src={primaryImage.url}
              alt={primaryImage.altText ?? auction.title}
              fill
              priority
              sizes='(max-width: 1024px) 100vw, 320px'
              className='object-cover'
            />
          </div>

          <div className='flex flex-col justify-center px-6 py-8 text-center sm:px-10 sm:py-12'>
          <p className='text-xs font-black tracking-[0.22em] text-primary uppercase'>
            {hasStarted ? 'Live Arena' : 'Live Arena lobby'}
          </p>
          <h1 className='mx-auto mt-4 max-w-3xl text-4xl leading-tight font-black text-foreground sm:text-5xl'>
            {auction.title}
          </h1>

          <p className='mt-3 text-muted'>
            {auction.category.name} · Listed by{' '}
            <span className='font-bold text-foreground'>
              {auction.seller.displayName}
            </span>
          </p>
          </div>
        </div>

        <div className='grid gap-8 px-6 py-8 sm:px-10 sm:py-10 lg:grid-cols-[1fr_18rem]'>
          <div>
            <div className='flex flex-wrap items-center gap-3'>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-black tracking-wider uppercase ${
                  hasStarted
                    ? 'bg-danger/10 text-danger'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {hasStarted
                  ? 'Live now'
                  : countdown.isComplete
                    ? 'Starting'
                    : 'Scheduled'}
              </span>

              <span className='text-sm text-muted'>
                {connectionStatus === 'connected'
                  ? 'Connected to Live Arena'
                  : connectionStatus === 'connecting'
                    ? 'Connecting to Live Arena…'
                    : connectionStatus === 'error'
                      ? 'Connection unavailable'
                      : 'Waiting to connect'}
              </span>
            </div>

            {hasStarted ? (
              <ActiveArenaPanel
                auction={auction}
                enabled={authStatus === 'authenticated'}
              />
            ) : (
              <>
                <h2 className='mt-8 text-2xl font-black text-foreground'>
                  {countdown.isComplete
                    ? 'Waiting for the auction to start'
                    : 'Auction begins in'}
                </h2>

                <div className='mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4'>
                  {countdownUnits.map(([key, label]) => (
                    <div
                      key={key}
                      className='rounded-2xl bg-surface-muted p-4 text-center'
                    >
                      <p className='font-mono text-3xl font-black text-primary'>
                        {countdown.isReady
                          ? String(countdown[key]).padStart(2, '0')
                          : '--'}
                      </p>

                      <p className='mt-1 text-xs font-bold tracking-wider text-muted uppercase'>
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                <p className='mt-5 text-sm text-muted'>
                  Scheduled for{' '}
                  <span className='font-bold text-foreground'>
                    {formatDateTime(auction.scheduledStartAt)}
                  </span>
                </p>
              </>
            )}

            {errorMessage && !hasStarted && (
              <p
                className='mt-5 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger'
                role='alert'
              >
                {errorMessage}
              </p>
            )}
          </div>
          <aside className='self-start rounded-2xl bg-surface-muted p-6'>
            <p className='text-xs font-black tracking-wider text-muted uppercase'>
              {hasStarted ? 'In the arena' : 'In the lobby'}
            </p>

            <p className='mt-3 font-mono text-5xl font-black text-primary'>
              {participantCount}
            </p>

            <p className='mt-2 text-sm leading-6 text-muted'>
              {participantCount === 1
                ? hasStarted
                  ? 'participant is connected'
                  : 'participant is waiting'
                : hasStarted
                  ? 'participants are connected'
                  : 'participants are waiting'}
            </p>

            <div className='mt-6 border-t border-border pt-6'>
              <p className='text-sm leading-6 text-muted'>
                {hasStarted
                  ? 'Prices and accepted bids update from the server in real time.'
                  : 'Stay on this page. The lobby will receive the auction start event automatically.'}
              </p>
            </div>
          </aside>{' '}
        </div>
      </section>
    </main>
  );
}
