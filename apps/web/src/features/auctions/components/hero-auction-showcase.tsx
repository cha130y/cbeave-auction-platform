'use client';

import type { PublicAuctionSummary } from '@/features/auctions/schemas/auction.schemas';
import { formatMoney } from '@/lib/formatters';
import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties, PointerEvent } from 'react';

type HeroAuctionShowcaseProps = {
  auctions: PublicAuctionSummary[];
};

export function HeroAuctionShowcase({ auctions }: HeroAuctionShowcaseProps) {
  const visibleAuctions = auctions.slice(0, 4);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rectangle = event.currentTarget.getBoundingClientRect();
    const horizontal = (event.clientX - rectangle.left) / rectangle.width - 0.5;
    const vertical = (event.clientY - rectangle.top) / rectangle.height - 0.5;

    event.currentTarget.style.setProperty(
      '--hero-rotate-x',
      `${vertical * -8}deg`,
    );
    event.currentTarget.style.setProperty(
      '--hero-rotate-y',
      `${horizontal * 10}deg`,
    );
  };

  const resetRotation = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty('--hero-rotate-x', '0deg');
    event.currentTarget.style.setProperty('--hero-rotate-y', '0deg');
  };

  return (
    <div
      className='hero-orbit block'
      onPointerMove={handlePointerMove}
      onPointerLeave={resetRotation}
    >
      <div className='hero-orbit__scene'>
        <div aria-hidden='true' className='hero-orbit__logo'>
          <Image
            src='/brand/cbeave-hero-logo.png'
            alt=''
            fill
            priority
            sizes='(min-width: 1024px) 272px, (min-width: 640px) 208px, 128px'
            className='object-contain'
          />
        </div>

        <div className='hero-orbit__ring'>
          {visibleAuctions.map((auction, index) => (
            <div
              key={auction.id}
              className='hero-orbit__slot'
              style={
                {
                  '--hero-card-angle': `${index * (360 / visibleAuctions.length)}deg`,
                } as CSSProperties
              }
            >
              <Link
                href={`/auctions/${auction.id}`}
                aria-label={`View ${auction.title}`}
                className='hero-orbit__card group'
              >
                <Image
                  src={auction.primaryImage.url}
                  alt={auction.primaryImage.altText ?? auction.title}
                  fill
                  sizes='(min-width: 1024px) 192px, (min-width: 640px) 160px, 112px'
                  className='object-cover transition duration-500 group-hover:scale-110'
                />

                <span className='absolute inset-0 bg-linear-to-t from-background via-background/35 to-transparent' />

                <span className='absolute right-3 bottom-3 left-3'>
                  <span className='block truncate text-xs font-black text-foreground'>
                    {auction.title}
                  </span>

                  <span className='mt-1 block font-mono text-xs font-bold text-primary'>
                    {formatMoney(auction.currentPrice, auction.currency)}
                  </span>
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
