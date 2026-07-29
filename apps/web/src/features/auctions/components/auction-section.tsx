import { AuctionCard } from '@/features/auctions/components/auction-card';
import { PublicAuctionSummary } from '@/features/auctions/schemas/auction.schemas';

type AuctionSectionProps = {
  auctions: PublicAuctionSummary[];
  description: string;
  emptyDescription?: string;
  emptyTitle?: string;
  eyebrow?: string;
  id: string;
  isError?: boolean;
  isPending?: boolean;
  onRetry?: () => void;
  title: string;
};

function AuctionCardSkeleton() {
  return (
    <div
      aria-hidden='true'
      className='animate-pulse overflow-hidden rounded-3xl border border-border bg-surface'
    >
      <div className='aspect-4/3 bg-surface-muted' />
      <div className='space-y-4 p-5'>
        <div className='h-3 w-24 rounded-full bg-surface-muted' />
        <div className='h-6 w-4/5 rounded-full bg-surface-muted' />
        <div className='h-4 w-2/5 rounded-full bg-surface-muted' />

        <div className='flex items-end justify-between border-t border-border pt-4'>
          <div className='space-y-2'>
            <div className='h-3 w-20 rounded-full bg-surface-muted' />
            <div className='h-6 w-28 rounded-full bg-surface-muted' />
          </div>
          <div className='h-8 w-10 rounded-lg bg-surface-muted' />
        </div>
      </div>
    </div>
  );
}

export function AuctionSection({
  auctions,
  description,
  emptyDescription = 'New auctions will appear here when sellers publish them.',
  emptyTitle = 'No auctions available',
  eyebrow,
  id,
  isError = false,
  isPending = false,
  onRetry,
  title,
}: AuctionSectionProps) {
  return (
    <section
      id={id}
      aria-label={`${id}-title`}
      className='scroll-mt-24 py-10 sm:py-14'
    >
      <div className='mb-7 flex flex-col gap-3 sm:mb-9'>
        {eyebrow && (
          <p className='text-xs font-black tracking-[0.22em] text-primary uppercase'>
            {eyebrow}
          </p>
        )}

        <div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-end'>
          <div className='max-w-2xl'>
            <h2
              id={`${id}-title`}
              className='text-3xl font-black tracking-tight text-foreground sm:text-4xl'
            >
              {title}
            </h2>
            <p className='mt-2 text-base leading-7 text-muted'>{description}</p>
          </div>
          {!isPending && !isError && auctions.length > 0 && (
            <p className='font-mono text-sm text-muted'>
              {auctions.length} {auctions.length === 1 ? 'auction' : 'auctions'}
            </p>
          )}
        </div>
      </div>

      {isPending && (
        <div
          aria-label={`Loading ${title}`}
          className='grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4'
        >
          {Array.from({ length: 4 }, (_, index) => (
            <AuctionCardSkeleton key={index} />
          ))}
        </div>
      )}

      {!isPending && isError && (
        <div
          role='alert'
          className='rounded-3xl border border-danger/30 bg-danger/5 px-6 py-10 text-center'
        >
          <h3 className='text-xl font-extrabold text-foreground'>
            Auctions could not be loaded
          </h3>
          <p className='mt-2 text-muted'>
            Check that the API is running, then try again.
          </p>

          {onRetry && (
            <button
              type='button'
              onClick={onRetry}
              className='mt-5 min-h-11 rounded-full bg-primary px-6 text-sm font-black text-background transition hover:bg-primary-strong'
            >
              Try again
            </button>
          )}
        </div>
      )}

      {!isPending && !isError && auctions.length === 0 && (
        <div className='rounded-3xl border border-dashed border-border-strong bg-surface/50 px-6 py-12 text-center'>
          <h3 className='text-xl font-extrabold text-foreground'>
            {emptyTitle}
          </h3>
          <p className='mt-2 text-muted'>{emptyDescription}</p>
        </div>
      )}

      {!isPending && !isError && auctions.length > 0 && (
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4'>
          {auctions.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}
    </section>
  );
}
