'use client';

import { CBeaveLogo } from '@/components/brand/cbeave-logo';
import { useAuth } from '@/features/auth/use-auth';
import Image from 'next/image';
import Link from 'next/link';

function createInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return '?';
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  //ex : Cs Sw ==> CS
}

export function MarketplaceHeader() {
  const { status, user } = useAuth();

  const displayName =
    user?.profile?.displayName ?? user?.email.split('@')[0] ?? 'Account';

  return (
    <header className='sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl'>
      <div className='mx-auto flex h-18 w-full max-w-360 items-center justify-between gap-6 px-4 sm:px-6 lg:px-8'>
        <Link
          href='/'
          aria-label='Go to the CBeave marketplace'
          className='shrink-0'
        >
          <CBeaveLogo className='scale-90 sm:scale-100' />
        </Link>
        <nav
          aria-label='Primary navigation'
          //hidden : Hides navigation by default on mobile
          className='hidden items-center gap-8 text-sm font-semibold text-muted md:flex'
        >
          <Link href='/' className='transition hover:text-foreground'>
            Discover
          </Link>
          <Link
            href='/#hot-auctions'
            className='transition hover:text-foreground'
          >
            Hot auctions
          </Link>

          <Link
            href='/#live-auctions'
            className='transition hover:text-foreground'
          >
            Live now
          </Link>
        </nav>
        <div className='flex min-w-0 items-center justify-end gap-3'>
          {status === 'loading' && (
            <div
              aria-label='Restoring session'
              className='h-10 w-28 animate-pulse rounded-full bg-surface-muted'
            />
          )}
          {status === 'unauthenticated' && (
            <Link
              href='/auth'
              className='inline-flex min-h-10 items-center justify-center rounded-full border border-border-strong px-4 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary'
            >
              Log in or register
            </Link>
          )}
          {status === 'authenticated' && (
            <Link
              href='/profile'
              className='flex min-w-0 items-center gap-3 rounded-full border border-border bg-surface px-2 py-1.5 transition hover:border-primary/60'
              aria-label={`Open account for ${displayName}`}
            >
              {user?.profile?.avatarUrl ? (
                <Image
                  src={user.profile.avatarUrl}
                  alt=''
                  referrerPolicy='no-referrer'
                  width={32}
                  height={32}
                  unoptimized
                  className='size-8 rounded-full object-cover'
                />
              ) : (
                <span
                  aria-hidden='true'
                  className='grid size-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-accent to-primary text-xs font-black text-white'
                >
                  {createInitials(displayName)}
                </span>
              )}

              <span className='hidden max-w-32 truncate pr-2 text-sm font-bold text-foreground sm:block'>
                {displayName}
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
