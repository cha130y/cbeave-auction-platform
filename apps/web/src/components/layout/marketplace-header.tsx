'use client';

import { CBeaveLogo } from '@/components/brand/cbeave-logo';
import { useAuth } from '@/features/auth/use-auth';
import { useInfiniteNotifications } from '@/features/notifications/queries/notification.queries';
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
  const unreadNotificationsQuery = useInfiniteNotifications(
    {
      limit: 1,
      unreadOnly: true,
    },
    status === 'authenticated',
  );

  const hasUnreadNotifications =
    unreadNotificationsQuery.data?.pages.some(
      (page) => page.items.length > 0,
    ) ?? false;

  const displayName =
    user?.profile?.displayName ?? user?.email.split('@')[0] ?? 'Account';

  const isAdmin = user?.role === 'ADMIN';

  return (
    <header className='sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl'>
      <div className='mx-auto flex h-18 w-full max-w-360 items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6 lg:gap-6 lg:px-8'>
        <Link
          href='/'
          aria-label='Go to the CBeave marketplace'
          className='shrink-0'
        >
          <CBeaveLogo compact className='sm:hidden' />
          <CBeaveLogo className='hidden sm:inline-flex' />
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
        <div className='flex min-w-0 items-center justify-end gap-2 sm:gap-3'>
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
            <>
              {isAdmin && (
                <Link
                  href='/admin/users'
                  className='inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-primary/40 px-4 text-sm font-black text-primary transition hover:bg-primary/10'
                >
                  Admin users
                </Link>
              )}

              <Link
                href='/notifications'
                aria-label={
                  hasUnreadNotifications
                    ? 'Open notifications; unread notifications available'
                    : 'Open notifications'
                }
                className='inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-bold text-foreground transition hover:border-primary/60 hover:text-primary'
              >
                <span className='relative'>
                  <svg
                    aria-hidden='true'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    className='size-4'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4'
                    />
                  </svg>

                  {hasUnreadNotifications && (
                    <span
                      aria-hidden='true'
                      className='absolute -top-1 -right-1 size-2 rounded-full bg-primary'
                    />
                  )}
                </span>

                <span className='hidden xl:inline'>Notifications</span>
              </Link>
              <Link
                href='/watchlist'
                aria-label='Open your watchlist'
                className='inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-bold text-foreground transition hover:border-primary/60 hover:text-primary'
              >
                <svg
                  aria-hidden='true'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  className='size-4'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5V21l-7-4-7 4V5.5Z'
                  />
                </svg>

                <span className='hidden lg:inline'>Watchlist</span>
              </Link>

              {!isAdmin && (
                <Link
                  href='/sell'
                  className='inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-black text-background transition hover:bg-primary-strong'
                >
                  <span>Sell</span>
                  <span className='hidden sm:inline'>&nbsp;an item</span>
                </Link>
              )}

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
            </>
          )}
        </div>
      </div>
    </header>
  );
}
