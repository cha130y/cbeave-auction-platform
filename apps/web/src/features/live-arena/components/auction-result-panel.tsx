'use client';

import type { AuctionEndedEvent } from '@/features/live-arena/schemas/live-arena.schemas';
import { formatDateTime, formatMoney } from '@/lib/formatters';

type AuctionResultPanelProps = {
  result: AuctionEndedEvent;
};

type PodiumRank = 1 | 2 | 3;

export function AuctionResultPanel({ result }: AuctionResultPanelProps) {
  const isSold = result.status === 'SOLD';
  const [winner, runnerUp, thirdPlace] = result.podiumBids;

  const renderPodiumPlace = (
    bid: (typeof result.podiumBids)[number] | undefined,
    rank: PodiumRank,
  ) => {
    if (!bid) {
      return null;
    }

    const styles = {
      1: {
        container: 'w-28 sm:w-32 -mt-4',
        avatar:
          'size-12 bg-amber-500 border-amber-300 text-base shadow-lg shadow-amber-500/30',
        name: 'text-amber-400 font-black',
        amount: 'text-xs text-amber-300 font-black',
        platform:
          'h-36 bg-amber-600/80 border-amber-400 text-amber-200 text-xl shadow-lg shadow-amber-500/10',
        medal: '🥇',
      },
      2: {
        container: 'w-24 sm:w-28',
        avatar: 'size-10 bg-slate-400 border-slate-300 text-sm',
        name: 'text-gray-300 font-bold',
        amount: 'text-[10px] text-gray-400',
        platform: 'h-24 bg-slate-800/80 border-slate-400 text-slate-300',
        medal: '🥈',
      },
      3: {
        container: 'w-24 sm:w-28',
        avatar: 'size-10 bg-amber-700 border-amber-600 text-sm',
        name: 'text-gray-300 font-bold',
        amount: 'text-[10px] text-gray-400',
        platform: 'h-16 bg-stone-800/80 border-amber-700 text-amber-500',
        medal: '🥉',
      },
    }[rank];

    return (
      <div className={`flex flex-col items-center ${styles.container}`}>
        {rank === 1 && <span className='mb-1 text-xs'>👑</span>}
        <div
          className={`mb-2 flex items-center justify-center rounded-full border-2 font-bold ${styles.avatar}`}
        >
          {bid.bidderDisplayName.charAt(0).toUpperCase()}
        </div>
        <p className={`w-full truncate text-xs ${styles.name}`}>
          {bid.bidderDisplayName}
        </p>
        <p className={`font-mono ${styles.amount}`}>
          {formatMoney(bid.amount, result.currency)}
        </p>
        <div
          className={`mt-2 flex w-full items-center justify-center rounded-t-2xl border-t-2 font-bold ${styles.platform}`}
        >
          {styles.medal}
        </div>
      </div>
    );
  };

  return (
    <section className='relative mt-6 min-h-[550px] overflow-hidden rounded-3xl border border-gray-800/80 bg-[#0b0c10] p-6 text-center text-white shadow-2xl'>
      {isSold && (
        <div className='pointer-events-none absolute inset-0 z-0 overflow-hidden'>
          {[...Array(18)].map((_, i) => (
            <div
              key={i}
              className='absolute top-[-10%] animate-fall rounded-sm opacity-80'
              style={{
                left: `${i * 5.8 + 2}%`,
                width: `${i % 3 === 0 ? 10 : 6}px`,
                height: `${i % 2 === 0 ? 14 : 8}px`,
                backgroundColor: [
                  '#ffd166',
                  '#06d6a0',
                  '#118ab2',
                  '#ef476f',
                  '#ffc6ff',
                ][i % 5],
                animationDuration: `${2.5 + (i % 4) * 0.8}s`,
                animationDelay: `${(i % 5) * 0.3}s`,
                animationIterationCount: 'infinite',
                transform: `rotate(${i * 25}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(600px) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
      `}</style>

      {isSold && (
        <div className='relative z-10 mx-auto flex size-16 animate-bounce items-center justify-center text-4xl'>
          🏆
        </div>
      )}

      <h1 className='relative z-10 mt-2 text-3xl font-black text-white sm:text-4xl'>
        {isSold ? 'Auction Complete' : 'Auction Ended'}
      </h1>

      <h2 className='relative z-10 mt-3 text-3xl font-black text-white'>
        {isSold ? 'We have a winner' : 'This auction ended without a sale'}
      </h2>

      <p className='relative z-10 mt-3 leading-7 text-gray-400'>
        {isSold
          ? `${result.winnerDisplayName ?? 'The winning bidder'} won the auction.`
          : 'No successful winner was selected for this auction.'}
      </p>

      {isSold && (
        <>
          <div className='relative z-10 mt-8 flex items-end justify-center gap-3 px-2 sm:gap-6'>
            {renderPodiumPlace(runnerUp, 2)}
            {renderPodiumPlace(winner, 1)}
            {renderPodiumPlace(thirdPlace, 3)}
          </div>

          <div className='relative z-10 mt-8 grid grid-cols-2 gap-3 text-left sm:grid-cols-3'>
            <div className='rounded-2xl border border-gray-800 bg-[#14161d]/80 p-4'>
              <p className='text-[10px] font-black uppercase tracking-wider text-gray-400'>
                Final price
              </p>
              <p className='mt-2 font-mono text-xl font-black text-white'>
                {formatMoney(result.finalPrice, result.currency)}
              </p>
            </div>

            <div className='rounded-2xl border border-gray-800 bg-[#14161d]/80 p-4'>
              <p className='text-[10px] font-black uppercase tracking-wider text-gray-400'>
                Total bids
              </p>
              <p className='mt-2 font-mono text-xl font-black text-white'>
                {result.bidCount}
              </p>
            </div>

            <div className='rounded-2xl border border-gray-800 bg-[#14161d]/80 p-4'>
              <p className='text-[10px] font-black uppercase tracking-wider text-gray-400'>
                Ended
              </p>
              <p className='mt-2 font-mono text-xl font-black text-white'>
                {formatDateTime(result.endedAt)}
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
