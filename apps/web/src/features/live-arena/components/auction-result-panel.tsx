import type { AuctionEndedEvent } from '@/features/live-arena/schemas/live-arena.schemas';
import { formatDateTime, formatMoney } from '@/lib/formatters';

type AuctionResultPanelProps = {
  result: AuctionEndedEvent;
};

export function AuctionResultPanel({ result }: AuctionResultPanelProps) {
  const isSold = result.status === 'SOLD';

  return (
    <section
      className='mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6'
      aria-live='polite'
    >
      <p className='text-xs font-black tracking-[0.22em] text-primary uppercase'>
        {isSold ? 'Auction sold' : 'Auction ended'}
      </p>

      <h2 className='mt-3 text-3xl font-black text-foreground'>
        {isSold ? 'We have a winner' : 'This auction ended without a sale'}
      </h2>

      <p className='mt-3 leading-7 text-muted'>
        {isSold
          ? `${result.winnerDisplayName ?? 'The winning bidder'} won the auction.`
          : 'No successful winner was selected for this auction.'}
      </p>

      <div className='mt-6 grid gap-3 sm:grid-cols-2'>
        <div className='rounded-2xl bg-surface-muted p-5'>
          <p className='text-xs font-black tracking-wider text-muted uppercase'>
            Final price
          </p>

          <p className='mt-2 font-mono text-3xl font-black text-primary'>
            {formatMoney(result.finalPrice, result.currency)}
          </p>
        </div>

        <div className='rounded-2xl bg-surface-muted p-5'>
          <p className='text-xs font-black tracking-wider text-muted uppercase'>
            Accepted bids
          </p>

          <p className='mt-2 font-mono text-3xl font-black text-foreground'>
            {result.bidCount}
          </p>
        </div>

        <div className='rounded-2xl bg-surface-muted p-5'>
          <p className='text-xs font-black tracking-wider text-muted uppercase'>
            Reserve
          </p>

          <p className='mt-2 font-bold text-foreground'>
            {result.reserveMet ? 'Met' : 'Not met'}
          </p>
        </div>

        <div className='rounded-2xl bg-surface-muted p-5'>
          <p className='text-xs font-black tracking-wider text-muted uppercase'>
            Ended
          </p>

          <p className='mt-2 font-bold text-foreground'>
            {formatDateTime(result.endedAt)}
          </p>
        </div>
      </div>
    </section>
  );
}
