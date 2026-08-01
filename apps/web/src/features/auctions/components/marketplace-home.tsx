'use client';

import { AuctionSection } from '@/features/auctions/components/auction-section';
import {
  useHotAuctions,
  usePublicAuctions,
} from '@/features/auctions/queries/auction.queries';
import { useAuth } from '@/features/auth/use-auth';
import Link from 'next/link';
import { useMemo } from 'react';

export function MarketplaceHome() {
  const hotAuctionsQuery = useHotAuctions(4);
  const publicAuctionsQuery = usePublicAuctions({ limit: 50 });
  const { status } = useAuth();

  const scheduledAuctions = useMemo(() => {
    const auctions = publicAuctionsQuery.data?.items ?? [];

    return auctions
      .filter((auction) => auction.status === 'SCHEDULED')
      .sort(
        (first, second) =>
          new Date(first.scheduledStartAt).getTime() -
          new Date(second.scheduledStartAt).getTime(),
      )
      .slice(0, 4);
  }, [publicAuctionsQuery.data]);

  const endingSoonAuctions = useMemo(() => {
    const auctions = publicAuctionsQuery.data?.items ?? [];

    return auctions
      .filter((auction) => auction.status === 'ACTIVE')
      .sort(
        (first, second) =>
          new Date(first.currentEndAt).getTime() -
          new Date(second.currentEndAt).getTime(),
      )
      .slice(0, 4);
  }, [publicAuctionsQuery.data]);

  const recentlyEndedAuctions = useMemo(() => {
    const auctions = publicAuctionsQuery.data?.items ?? [];

    return auctions
      .filter(
        (auction) => auction.status === 'SOLD' || auction.status === 'UNSOLD',
      )
      .sort(
        (first, second) =>
          new Date(second.currentEndAt).getTime() -
          new Date(first.currentEndAt).getTime(),
      )
      .slice(0, 4);
  }, [publicAuctionsQuery.data]);

  return (
    <>
      <section className='relative isolate overflow-hidden border-b border-border'>
        <div
          aria-hidden='true'
          className='absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_right,rgba(0,229,255,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.16),transparent_38%)]'
        />
        <div
          aria-hidden='true'
          className='absolute bottom-0 left-[8%] -z-10 size-72 rounded-full bg-accent/10 blur-3xl'
        />

        <div className='mx-auto w-full max-w-360 px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32'>
          <div className='max-w-4xl'>
            <p className='text-xs font-black tracking-[0.28em] text-primary uppercase sm:text-sm'>
              Scheduled real-time auctions
            </p>
            <h1 className='mt-5 text-5xl leading-[0.95] font-black tracking-[-0.045em] text-foreground sm:text-6xl lg:text-8xl'>
              Find it. Bid live.
              <span className='block text-primary'>Win it.</span>
            </h1>

            <p className='mt-7 max-w-2xl text-lg leading-8 text-muted sm:text-xl'>
              Discover standout items, enter the live arena, and compete through
              secure real-time bidding.
            </p>
            <div className='mt-9 flex flex-col gap-3 sm:flex-row'>
              <Link
                href='/#hot-auctions'
                className='inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-black text-background transition hover:bg-primary-strong'
              >
                Explore hot auctions
              </Link>
              <Link
                href={status === 'authenticated' ? '/profile' : '/auth'}
                className='inline-flex min-h-12 items-center justify-center rounded-full border border-border-strong bg-surface/50 px-7 text-sm font-black text-foreground transition hover:border-primary hover:text-primary'
              >
                {status === 'authenticated'
                  ? 'View your profile'
                  : 'Log in or register'}
              </Link>{' '}
            </div>
          </div>
        </div>
      </section>

      <div className='mx-auto w-full max-w-360 px-4 sm:px-6 lg:px-8'>
        <AuctionSection
          id='hot-auctions'
          eyebrow='Trending now'
          title='Hot auctions'
          description='Active auctions ranked by bidding activity and the nearest deadline.'
          auctions={hotAuctionsQuery.data?.items ?? []}
          isPending={hotAuctionsQuery.isPending}
          isError={hotAuctionsQuery.isError}
          emptyTitle='No hot auctions right now'
          emptyDescription='Active auctions will appear here as bidding begins.'
          onRetry={() => {
            void hotAuctionsQuery.refetch();
          }}
        />

        <AuctionSection
          id='starting-soon'
          eyebrow='Get ready'
          title='Starting soon'
          description='Preview scheduled auctions and be ready when their live arenas open.'
          auctions={scheduledAuctions}
          isPending={publicAuctionsQuery.isPending}
          isError={publicAuctionsQuery.isError}
          emptyTitle='Nothing scheduled yet'
          emptyDescription='New scheduled auctions will appear here after publication.'
          onRetry={() => {
            void publicAuctionsQuery.refetch();
          }}
        />

        <AuctionSection
          id='live-auctions'
          eyebrow='Last chance'
          title='Ending soon'
          description='Active auctions ordered by the nearest current deadline, including extensions.'
          auctions={endingSoonAuctions}
          isPending={publicAuctionsQuery.isPending}
          isError={publicAuctionsQuery.isError}
          emptyTitle='No auctions are ending soon'
          emptyDescription='Live auctions will appear here when bidding opens.'
          onRetry={() => {
            void publicAuctionsQuery.refetch();
          }}
        />

        <AuctionSection
          id='recent-results'
          eyebrow='Completed auctions'
          title='Recent results'
          description='Review recently completed auctions and their final public prices.'
          auctions={recentlyEndedAuctions}
          isPending={publicAuctionsQuery.isPending}
          isError={publicAuctionsQuery.isError}
          emptyTitle='No completed auctions yet'
          emptyDescription='Completed auction results will appear here.'
          onRetry={() => {
            void publicAuctionsQuery.refetch();
          }}
        />
      </div>
    </>
  );
}
