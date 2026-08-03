'use client';

import { useAuth } from '@/features/auth/use-auth';
import {
  useInfiniteNotifications,
  useMarkNotificationRead,
} from '@/features/notifications/queries/notification.queries';
import type { NotificationType } from '@/features/notifications/schemas/notification.schemas';
import { formatDateTime } from '@/lib/formatters';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const notificationTypeLabels: Record<NotificationType, string> = {
  OUTBID: 'Outbid',
  AUCTION_WON: 'Auction won',
  AUCTION_ENDED: 'Auction ended',
  AUCTION_CANCELLED: 'Auction cancelled',
};

export function NotificationScreen() {
  const router = useRouter();
  const { status } = useAuth();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const notificationsQuery = useInfiniteNotifications(
    {
      limit: 20,
      unreadOnly,
    },
    status === 'authenticated',
    10_000,
  );

  const markReadMutation = useMarkNotificationRead();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth');
    }
  }, [router, status]);

  if (status !== 'authenticated' || notificationsQuery.isPending) {
    return (
      <div className='mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8'>
        <div className='h-120 animate-pulse rounded-3xl border border-border bg-surface' />
      </div>
    );
  }

  if (notificationsQuery.isError) {
    return (
      <section className='mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6'>
        <h1 className='text-3xl font-black text-foreground'>
          Notifications could not be loaded
        </h1>

        <p className='mt-3 text-muted'>
          Please refresh the page or try again later.
        </p>
      </section>
    );
  }

  const notifications = notificationsQuery.data.pages.flatMap(
    (page) => page.items,
  );

  return (
    <section className='mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8'>
      <div className='flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-black tracking-[0.22em] text-primary uppercase'>
            Account activity
          </p>

          <h1 className='mt-3 text-4xl font-black tracking-tight text-foreground sm:text-5xl'>
            Notifications
          </h1>

          <p className='mt-3 text-base leading-7 text-muted'>
            Review auction updates that are relevant to your account.
          </p>
        </div>

        <div
          className='inline-flex w-fit rounded-full border border-border bg-surface p-1'
          aria-label='Notification filter'
        >
          <button
            type='button'
            aria-pressed={!unreadOnly}
            className={`min-h-10 rounded-full px-5 text-sm font-bold transition ${
              !unreadOnly
                ? 'bg-surface-muted text-foreground'
                : 'text-muted hover:text-foreground'
            }`}
            onClick={() => {
              setUnreadOnly(false);
            }}
          >
            All
          </button>

          <button
            type='button'
            aria-pressed={unreadOnly}
            className={`min-h-10 rounded-full px-5 text-sm font-bold transition ${
              unreadOnly
                ? 'bg-surface-muted text-foreground'
                : 'text-muted hover:text-foreground'
            }`}
            onClick={() => {
              setUnreadOnly(true);
            }}
          >
            Unread
          </button>
        </div>
      </div>

      {markReadMutation.isError && (
        <div
          className='mt-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger'
          role='alert'
        >
          {markReadMutation.error instanceof Error
            ? markReadMutation.error.message
            : 'The notification could not be updated.'}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className='mt-10 rounded-3xl border border-dashed border-border px-6 py-16 text-center'>
          <h2 className='text-xl font-extrabold text-foreground'>
            {unreadOnly
              ? 'You have no unread notifications'
              : 'You have no notifications'}
          </h2>

          <p className='mt-2 text-muted'>
            Auction updates will appear here when they become available.
          </p>
        </div>
      ) : (
        <>
          <div className='mt-10 space-y-4'>
            {notifications.map((notification) => {
              const isUnread = notification.readAt === null;
              const isMarkingRead =
                markReadMutation.isPending &&
                markReadMutation.variables === notification.id;

              return (
                <article
                  key={notification.id}
                  className={`rounded-2xl border p-5 sm:p-6 ${
                    isUnread
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-surface'
                  }`}
                >
                  <div className='flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between'>
                    <div className='min-w-0'>
                      <div className='flex items-center gap-3'>
                        {isUnread && (
                          <span
                            aria-label='Unread notification'
                            className='size-2.5 shrink-0 rounded-full bg-primary'
                          />
                        )}

                        <p className='text-xs font-black tracking-wider text-primary uppercase'>
                          {notificationTypeLabels[notification.type]}
                        </p>
                      </div>

                      <h2 className='mt-3 text-xl font-black text-foreground'>
                        {notification.title}
                      </h2>

                      <p className='mt-2 leading-7 text-muted'>
                        {notification.message}
                      </p>

                      <p className='mt-3 text-sm text-muted'>
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>

                    <div className='flex shrink-0 flex-wrap gap-3'>
                      <Link
                        href={`/auctions/${notification.auctionId}`}
                        className='inline-flex min-h-10 items-center justify-center rounded-full border border-border px-4 text-sm font-bold text-foreground transition hover:border-primary/60 hover:text-primary'
                      >
                        View auction
                      </Link>

                      {isUnread && (
                        <button
                          type='button'
                          className='min-h-10 rounded-full bg-primary px-4 text-sm font-black text-background transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-50'
                          disabled={markReadMutation.isPending}
                          onClick={() => {
                            markReadMutation.mutate(notification.id);
                          }}
                        >
                          {isMarkingRead ? 'Updating...' : 'Mark as read'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {notificationsQuery.hasNextPage && (
            <div className='mt-10 flex justify-center'>
              <button
                type='button'
                className='min-h-11 rounded-full border border-border px-6 text-sm font-black text-foreground transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
                disabled={notificationsQuery.isFetchingNextPage}
                onClick={() => {
                  void notificationsQuery.fetchNextPage();
                }}
              >
                {notificationsQuery.isFetchingNextPage
                  ? 'Loading...'
                  : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
