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

  // Sudden Death checking
  const isSuddenDeath = arenaState.extensionCount > 0;

  //closing soon checking
  const isClosingSoon =
    !isSuddenDeath &&
    countdown.isReady &&
    countdown.totalMilliseconds <= 120_000;

  // Visual Theme Matching
  const theme = isSuddenDeath
    ? {
        priceBorder: 'border-[#ff3b5c]/40',
        priceBg: 'bg-[#1a050b]/80',
        priceGlow: 'shadow-[0_0_50px_rgba(255,59,92,0.25)]',
        accentText: 'text-[#ff4d6d]',
        kingBorder: 'border-[#ff3b5c]/30 bg-[#250810]/70',
      }
    : {
        priceBorder: 'border-cyan-500/30',
        priceBg: 'bg-cyan-950/20',
        priceGlow: 'shadow-[0_0_35px_rgba(6,182,212,0.2)]',
        accentText: 'text-cyan-400',
        kingBorder: 'border-cyan-500/20 bg-cyan-950/40',
      };

  return (
    <div className='mt-4 space-y-6 text-white'>
      {/*Top Warning Bar */}
      {isSuddenDeath && (
        <div className='flex items-center gap-2 rounded-lg bg-[#1f050a] border border-[#ff3b5c]/30 px-4 py-2 text-xs font-semibold text-[#ff4d6d]'>
          <span className='font-black'>⚠️ WARNING —</span>
          <span className='opacity-90'>
            Every valid bid resets the countdown timer.
          </span>
        </div>
      )}

      {/* Clossing soon action */}
      {isClosingSoon && (
        <section className='rounded-2xl border border-amber-400/35 bg-amber-950/20 p-5'>
          <p className='text-xs font-black tracking-[0.18em] text-amber-300 uppercase'>
            Closing soon
          </p>

          <h2 className='mt-2 text-2xl font-extrabold text-white'>
            Less than two minutes remaining
          </h2>

          <p className='mt-2 text-sm leading-6 text-gray-300'>
            Place your bid soon. Eligible bids near the deadline may extend the
            auction.
          </p>
        </section>
      )}

      {/*suddenDeath action */}
      {isSuddenDeath && (
        <section
          className='animate-sudden-death-alert relative overflow-hidden rounded-2xl border border-[#ff3b5c]/45 bg-[linear-gradient(120deg,rgba(255,59,92,0.16),rgba(31,5,10,0.96)_46%,rgba(8,27,35,0.94))] p-5 shadow-[0_0_42px_rgba(255,59,92,0.18)]'
          role='status'
          aria-live='polite'
        >
          <div className='absolute -right-10 -top-10 size-32 rounded-full bg-[#ff3b5c]/20 blur-3xl' />

          <div className='relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <p className='flex items-center gap-2 text-xs font-black tracking-[0.18em] text-[#ff4d6d] uppercase'>
                <span className='size-2 animate-[pulse_1.6s_ease-in-out_infinite] rounded-full bg-[#ff4d6d] motion-reduce:animate-none' />
                Sudden death
                {latestExtension &&
                  ` · Extension #${latestExtension.extensionNumber}`}
              </p>

              <h2 className='mt-2 text-2xl font-extrabold text-white'>
                New bids extend the deadline
              </h2>

              <p className='mt-2 max-w-xl text-sm leading-6 text-gray-300'>
                Every accepted bid in this period adds time, so the auction
                stays open while bidding continues.
              </p>
            </div>

            {latestExtension && (
              <dl className='grid grid-cols-2 gap-2 text-left sm:min-w-72'>
                <div className='rounded-xl border border-white/10 bg-black/20 px-3 py-2'>
                  <dt className='text-[10px] font-black tracking-[0.16em] text-gray-400 uppercase'>
                    Triggering bid
                  </dt>
                  <dd className='mt-1 font-mono font-black text-[#ff6b85]'>
                    {formatMoney(
                      latestExtension.triggeringBid.amount,
                      arenaState.currency,
                    )}
                  </dd>
                </div>

                <div className='rounded-xl border border-white/10 bg-black/20 px-3 py-2'>
                  <dt className='text-[10px] font-black tracking-[0.16em] text-gray-400 uppercase'>
                    New deadline
                  </dt>
                  <dd className='mt-1 text-sm font-bold text-white'>
                    {formatDateTime(latestExtension.newEndAt)}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </section>
      )}

      {/*Timer Section */}
      <div className='text-center py-2'>
        <p className='text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase'>
          {isSuddenDeath ? 'SUDDEN DEATH COUNTDOWN' : 'TIME REMAINING'}
        </p>

        <div
          className={`mt-2 font-mono text-4xl sm:text-5xl font-black ${theme.accentText} tracking-wider`}
        >
          {countdown.isReady ? (
            <>
              {countdown.days > 0 && <span>{countdown.days}d </span>}
              {countdown.hours > 0 && <span>{countdown.hours}h </span>}
              <span>{countdown.minutes}m </span>
              <span>{String(countdown.seconds).padStart(2, '0')}s</span>
            </>
          ) : (
            '--m --s'
          )}
        </div>
      </div>

      {/* Leaderboard / King of the Hill*/}
      <section className='space-y-3'>
        <div className='flex items-center gap-2 text-gray-400'>
          <span className='text-xs'>👑</span>
          <h3 className='text-[10px] font-black tracking-[0.18em] uppercase'>
            KING OF THE HILL
          </h3>
        </div>

        {arenaState.recentBids.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-gray-800 p-6 text-center text-xs text-gray-500'>
            No active bids yet
          </div>
        ) : (
          <div className='space-y-2.5'>
            {[...arenaState.recentBids].reverse().map((bid, index) => {
              const isFirst = index === 0;
              return (
                <div
                  key={bid.sequenceNo}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 border transition-all ${
                    isFirst
                      ? theme.kingBorder
                      : 'border-gray-800/80 bg-[#111318]/60 text-gray-300'
                  }`}
                >
                  <div className='flex items-center gap-3'>
                    <span className='text-xs font-bold w-6 text-center text-gray-400'>
                      {isFirst
                        ? '🥇'
                        : index === 1
                          ? '🥈'
                          : index === 2
                            ? '🥉'
                            : `#${index + 1}`}
                    </span>

                    <div className='size-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm'>
                      {bid.bidderDisplayName.charAt(0).toUpperCase()}
                    </div>

                    <span className='font-bold text-sm text-gray-100'>
                      {bid.bidderDisplayName}
                    </span>

                    {isFirst && <span className='text-xs'>👑</span>}
                  </div>

                  <span
                    className={`font-mono font-black text-sm ${isFirst ? theme.accentText : 'text-gray-300'}`}
                  >
                    {formatMoney(bid.amount, arenaState.currency)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/*Bid Form */}
      <PlaceBidForm
        auction={liveAuction}
        minimumNextBid={arenaState.minimumNextBid}
        canBid={arenaState.canBid}
      />
    </div>
  );
}
