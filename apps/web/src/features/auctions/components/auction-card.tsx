import {
  PublicAuctionStatus,
  PublicAuctionSummary,
} from '@/features/auctions/schemas/auction.schemas';
import Image from 'next/image';
import Link from 'next/link';

type AuctionCardProps = {
  auction: PublicAuctionSummary;
};

const statusLabels: Record<PublicAuctionStatus, string> = {
  SCHEDULED: 'Starting soon',
  ACTIVE: 'Live',
  SOLD: 'sold',
  UNSOLD: 'Ended',
};

const statusClasses: Record<PublicAuctionStatus, string> = {
  SCHEDULED: 'bg-accent/90 text-white',
  ACTIVE: 'bg-danger/90 text-white',
  SOLD: 'bg-success/90 text-background',
  UNSOLD: 'bg-surface-muted/90 text-muted',
};

function formatMoney(amount: string, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(amount));
}

function formatAuctionDate(
  status: PublicAuctionStatus,
  scheduledStartAt: string,
  currentEndAt: string,
): string {
  const date =
    status === 'SCHEDULED'
      ? new Date(scheduledStartAt)
      : new Date(currentEndAt);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

  switch (status) {
    case 'SCHEDULED':
      return `Starts ${formattedDate}`;
    case 'ACTIVE':
      return `Ends ${formattedDate}`;
    case 'SOLD':
      return `Sold ${formattedDate}`;
    case 'UNSOLD':
      return `Ended ${formattedDate}`;
  }
}

export function AuctionCard({ auction }: AuctionCardProps) {
  const timingLabel = formatAuctionDate(
    auction.status,
    auction.scheduledStartAt,
    auction.currentEndAt,
  );

  return (
    <article className='group overflow-hidden rounded-3xl border border-border bg-surface transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_18px_60px_rgba(0,229,255,0.08)]'>
      <Link
        href={`/auctions/${auction.id}`}
        aria-label={`View ${auction.title}`}
        className='block h-full'
      >
        <div className='relative aspect-4/3 overflow-hidden bg-surface-muted'>
          <Image
            src={auction.primaryImage.url}
            alt={auction.primaryImage.altText ?? auction.title}
            fill
            sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
            className='object-cover transition duration-500 group-hover:scale-105'
          />
          <span
            className={`absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-black tracking-wider uppercase backdrop-blur ${statusClasses[auction.status]}`}
          >
            {statusLabels[auction.status]}
          </span>
        </div>

        <div className='flex h-full flex-col gap-4 p-5'>
          <div className='space-y-2'>
            <p className='text-xs font-bold tracking-wider text-primary uppercase'>
              {auction.category.name}
            </p>
            <h2 className='line-clamp-2 text-xl leading-tight font-extrabold text-foreground transition group-hover:text-primary'>
              {auction.title}
            </h2>
            <p className='text-sm text-muted'>{timingLabel}</p>
          </div>

          <div className='mt-auto flex items-end justify-between gap-4 border-t border-border pt-4'>
            <div>
              <p className='text-xs font-bold tracking-wider text-muted uppercase'>
                {auction.status === 'ACTIVE' ? 'Current bid' : 'Current price'}
              </p>

              <p className='font-mono text-lg font-bold text-foreground'>
                {formatMoney(auction.currentPrice, auction.currency)}
              </p>
            </div>

            <div className='text-right'>
              <p className='font-mono text-sm font-bold text-foreground'>
                {auction.bidCount}
              </p>

              <p className='text-xs text-muted'>
                {auction.bidCount === 1 ? 'bid' : 'bids'}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
