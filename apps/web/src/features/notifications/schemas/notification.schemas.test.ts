import { describe, expect, it } from 'vitest';

import { listWatchlistResponseSchema } from '@/features/watchlists/schemas/watchlist.schemas';

import {
  listNotificationsResponseSchema,
  notificationSchema,
} from './notification.schemas';

const NOTIFICATION_ID = '11111111-1111-4111-8111-111111111111';
const AUCTION_ID = '22222222-2222-4222-8222-222222222222';
const CATEGORY_ID = '33333333-3333-4333-8333-333333333333';
const SELLER_ID = '44444444-4444-4444-8444-444444444444';

const notification = (overrides: Record<string, unknown> = {}) => ({
  id: NOTIFICATION_ID,
  auctionId: AUCTION_ID,
  type: 'OUTBID',
  title: 'You have been outbid',
  message: 'A higher bid was placed on "Vintage diving watch".',
  readAt: null,
  createdAt: '2026-03-01T11:00:00.000Z',
  ...overrides,
});

const watchedAuction = {
  id: AUCTION_ID,
  title: 'Vintage diving watch',
  status: 'ACTIVE',
  currency: 'THB',
  startingPrice: '500.00',
  currentPrice: '750.00',
  bidCount: 3,
  reserveMet: true,
  scheduledStartAt: '2026-03-01T10:00:00.000Z',
  currentEndAt: '2026-03-01T12:00:00.000Z',
  publishedAt: '2026-03-01T09:00:00.000Z',
  primaryImage: { url: 'https://cdn.test/watch.jpg', altText: null },
  category: { id: CATEGORY_ID, name: 'Watches', slug: 'watches' },
  seller: { id: SELLER_ID, displayName: 'AuctionJohn', avatarUrl: null },
};

describe('notificationSchema', () => {
  it.each(['OUTBID', 'AUCTION_WON', 'AUCTION_ENDED', 'AUCTION_CANCELLED'])(
    'accepts a %s notification',
    (type) => {
      expect(notificationSchema.parse(notification({ type })).type).toBe(type);
    },
  );

  it('accepts a notification that has been read', () => {
    const parsed = notificationSchema.parse(
      notification({ readAt: '2026-03-01T11:05:00.000Z' }),
    );

    expect(parsed.readAt).toBe('2026-03-01T11:05:00.000Z');
  });

  it('requires an auction to navigate to', () => {
    expect(
      notificationSchema.safeParse(notification({ auctionId: null })).success,
    ).toBe(false);
  });

  it.each([
    ['an unknown type', { type: 'AUCTION_STARTED' }],
    ['an empty title', { title: '' }],
    ['an empty message', { message: '' }],
    ['a non-ISO timestamp', { createdAt: '2026-03-01 11:00' }],
  ])('rejects %s', (_label, override) => {
    expect(notificationSchema.safeParse(notification(override)).success).toBe(
      false,
    );
  });

  it('drops a recipient id the API should never have sent', () => {
    const parsed = notificationSchema.parse(
      notification({ userId: '99999999-9999-4999-8999-999999999999' }),
    );

    expect(parsed).not.toHaveProperty('userId');
  });
});

describe('listNotificationsResponseSchema', () => {
  it('accepts an empty inbox', () => {
    expect(
      listNotificationsResponseSchema.parse({ items: [], nextCursor: null }),
    ).toEqual({ items: [], nextCursor: null });
  });

  it('accepts a page that carries a cursor', () => {
    const parsed = listNotificationsResponseSchema.parse({
      items: [notification()],
      nextCursor: NOTIFICATION_ID,
    });

    expect(parsed.nextCursor).toBe(NOTIFICATION_ID);
  });

  it('rejects the page when one notification is malformed', () => {
    expect(
      listNotificationsResponseSchema.safeParse({
        items: [notification(), notification({ type: 'SOMETHING_ELSE' })],
        nextCursor: null,
      }).success,
    ).toBe(false);
  });
});

describe('listWatchlistResponseSchema', () => {
  it('accepts a watched auction summary', () => {
    const parsed = listWatchlistResponseSchema.parse({
      items: [
        {
          watchedAt: '2026-03-01T09:30:00.000Z',
          auction: watchedAuction,
        },
      ],
      nextCursor: null,
    });

    expect(parsed.items[0].auction.id).toBe(AUCTION_ID);
  });

  it('drops a reserve price the API should never have sent', () => {
    const parsed = listWatchlistResponseSchema.parse({
      items: [
        {
          watchedAt: '2026-03-01T09:30:00.000Z',
          auction: { ...watchedAuction, reservePrice: '900.00' },
        },
      ],
      nextCursor: null,
    });

    expect(parsed.items[0].auction).not.toHaveProperty('reservePrice');
  });

  it('accepts an empty watchlist', () => {
    expect(
      listWatchlistResponseSchema.parse({ items: [], nextCursor: null }).items,
    ).toEqual([]);
  });
});
