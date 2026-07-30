'use client';

import { usePublicAuction } from '@/features/auctions/queries/auction.queries';
import { PlaceBidForm } from '@/features/bidding/components/place-bid-form';
import { PublicBidHistory } from '@/features/bidding/components/public-bid-history';
import { WatchAuctionButton } from '@/features/watchlists/components/watch-auction-button';
import { formatDateTime, formatMoney } from '@/lib/formatters';
import Image from 'next/image';
import Link from 'next/link';

type PublicAuctionDetailProps = {
  auctionId: string;
};

export function PublicAuctionDetail({ auctionId }: PublicAuctionDetailProps) {
  const auctionQuery = usePublicAuction(auctionId);

  if (auctionQuery.isPending) {
    return (
      <div className='mx-auto w-full max-w-360 px-4 py-16 sm:px-6 lg:px-8'>
        <div className='h-120 animate-pulse rounded-3xl bg-surface' />
      </div>
    );
  }

  if (auctionQuery.isError) {
    return (
      <div className='mx-auto w-full max-w-3xl px-4 py-20 text-center'>
        <h1 className='text-3xl font-black text-foreground'>
          Auction could not be loaded
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
      </div>
    );
  }

  const auction = auctionQuery.data;
  const primaryImage =
    auction.images.find((image) => image.isPrimary) ?? auction.images[0];

  return (
    <div className='mx-auto w-full max-w-360 px-4 py-10 sm:px-6 lg:px-8'>
      <Link
        href='/'
        className='text-sm font-bold text-muted transition hover:text-primary'
      >
        ← Back to marketplace
      </Link>

      <div className='mt-7 grid gap-8 lg:grid-cols-2'>
        <div className='relative aspect-4/3 overflow-hidden rounded-3xl border border-border bg-surface'>
          <Image
            src={primaryImage.url}
            alt={primaryImage.altText ?? auction.title}
            fill
            priority
            sizes='(max-width: 1024px) 100vw, 50vw'
            className='object-cover'
          />
        </div>

        <section className='rounded-3xl border border-border bg-surface p-6 sm:p-8'>
          <div className='flex flex-wrap items-center gap-3'>
            <span className='rounded-full bg-primary/10 px-3 py-1 text-xs font-black tracking-wider text-primary uppercase'>
              {auction.status}
            </span>

            <span className='text-sm font-bold text-muted'>
              {auction.category.name}
            </span>
          </div>

          <h1 className='mt-5 text-4xl leading-tight font-black tracking-tight text-foreground'>
            {auction.title}
          </h1>

          <p className='mt-3 text-sm text-muted'>
            Listed by{' '}
            <span className='font-bold text-foreground'>
              {auction.seller.displayName}
            </span>
          </p>

          <div className='mt-6 flex flex-wrap gap-3'>
            <WatchAuctionButton auctionId={auction.id} />

            {(auction.status === 'SCHEDULED' ||
              auction.status === 'ACTIVE') && (
              <Link
                href={`/auctions/${auction.id}/live`}
                className='inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 font-bold text-background transition hover:bg-primary/90'
              >
                {auction.status === 'ACTIVE'
                  ? 'Enter Live Arena'
                  : 'Join auction lobby'}
              </Link>
            )}
          </div>

          <div className='mt-8 border-y border-border py-6'>
            <p className='text-xs font-black tracking-wider text-muted uppercase'>
              {auction.status === 'ACTIVE' ? 'Current bid' : 'Current price'}
            </p>

            <p className='mt-2 font-mono text-4xl font-black text-primary'>
              {formatMoney(auction.currentPrice, auction.currency)}
            </p>

            <p className='mt-2 text-sm text-muted'>
              Minimum increment:{' '}
              {formatMoney(auction.minBidIncrement, auction.currency)}
            </p>
          </div>

          <div className='mt-6'>
            <PlaceBidForm auction={auction} />
          </div>

          <div className='mt-6 grid grid-cols-2 gap-4'>
            <div className='rounded-2xl bg-surface-muted p-4'>
              <p className='text-xs font-bold text-muted uppercase'>Bids</p>

              <p className='mt-1 font-mono text-xl font-bold text-foreground'>
                {auction.bidCount}
              </p>
            </div>

            <div className='rounded-2xl bg-surface-muted p-4'>
              <p className='text-xs font-bold text-muted uppercase'>Reserve</p>

              <p className='mt-1 text-sm font-bold text-foreground'>
                {auction.reserveMet ? 'Met' : 'Not met'}
              </p>
            </div>
          </div>

          <div className='mt-6 space-y-2 text-sm text-muted'>
            <p>
              Starts:{' '}
              <span className='text-foreground'>
                {formatDateTime(auction.scheduledStartAt)}
              </span>
            </p>

            <p>
              Current deadline:{' '}
              <span className='text-foreground'>
                {formatDateTime(auction.currentEndAt)}
              </span>
            </p>
          </div>

          <div className='mt-7'>
            <h2 className='text-lg font-extrabold text-foreground'>
              Description
            </h2>

            <p className='mt-2 leading-7 whitespace-pre-line text-muted'>
              {auction.description}
            </p>
          </div>
        </section>
      </div>

      <section className='mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-8'>
        <h2 className='text-xl font-extrabold text-foreground'>Bid history</h2>

        <p className='mt-2 text-sm leading-6 text-muted'>
          Accepted bids are shown in chronological order. Bidder names are
          masked for privacy.
        </p>

        <PublicBidHistory auctionId={auction.id} currency={auction.currency} />
      </section>
    </div>
  );
}
