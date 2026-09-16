import { describe, expect, it } from 'vitest';

import {
  listPublicAuctionsResponseSchema,
  publicAuctionDetailSchema,
  publicAuctionSummarySchema,
} from './auction.schemas';

const AUCTION_ID = '11111111-1111-4111-8111-111111111111';
const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';
const SELLER_ID = '33333333-3333-4333-8333-333333333333';
const IMAGE_ID = '44444444-4444-4444-8444-444444444444';

const summary = (overrides: Record<string, unknown> = {}) => ({
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
  ...overrides,
});

const detail = (overrides: Record<string, unknown> = {}) => ({
  ...summary(),
  description: 'A well-kept diver from 1974.',
  minBidIncrement: '50.00',
  originalEndAt: '2026-03-01T12:00:00.000Z',
  startedAt: '2026-03-01T10:00:00.000Z',
  endedAt: null,
  extensionCount: 0,
  soldPrice: null,
  podiumBids: [],
  images: [
    {
      id: IMAGE_ID,
      url: 'https://cdn.test/watch.jpg',
      altText: null,
      position: 0,
      isPrimary: true,
    },
  ],
  winner: null,
  ...overrides,
});

describe('publicAuctionSummarySchema', () => {
  it('accepts a well-formed summary', () => {
    expect(publicAuctionSummarySchema.parse(summary())).toMatchObject({
      id: AUCTION_ID,
      currentPrice: '750.00',
      reserveMet: true,
    });
  });

  it('drops a reserve price the API should never have sent', () => {
    const parsed = publicAuctionSummarySchema.parse(
      summary({ reservePrice: '900.00' }),
    );

    // Zod strips unknown keys, so a leak on the API side still cannot reach a
    // component or the React Query cache through this boundary.
    expect(parsed).not.toHaveProperty('reservePrice');
  });

  it.each([
    ['a price without cents', { currentPrice: '750' }],
    ['a price with three decimals', { currentPrice: '750.000' }],
    ['a price as a number', { currentPrice: 750 }],
    ['a negative bid count', { bidCount: -1 }],
    ['a fractional bid count', { bidCount: 1.5 }],
    ['a non-UUID id', { id: 'auction-1' }],
    ['a lowercase currency', { currency: 'thb' }],
    ['a draft status', { status: 'DRAFT' }],
    ['a cancelled status', { status: 'CANCELLED' }],
    ['an empty title', { title: '' }],
    ['a non-ISO end time', { currentEndAt: '2026-03-01 12:00' }],
    ['a missing primary image', { primaryImage: undefined }],
  ])('rejects %s', (_label, override) => {
    expect(
      publicAuctionSummarySchema.safeParse(summary(override)).success,
    ).toBe(false);
  });

  it('accepts a root-relative image path as well as an absolute URL', () => {
    const parsed = publicAuctionSummarySchema.parse(
      summary({ primaryImage: { url: '/placeholder.svg', altText: 'None' } }),
    );

    expect(parsed.primaryImage.url).toBe('/placeholder.svg');
  });
});

describe('listPublicAuctionsResponseSchema', () => {
  it('accepts an empty page with no cursor', () => {
    expect(
      listPublicAuctionsResponseSchema.parse({ items: [], nextCursor: null }),
    ).toEqual({ items: [], nextCursor: null });
  });

  it('accepts a page that carries a cursor', () => {
    const parsed = listPublicAuctionsResponseSchema.parse({
      items: [summary()],
      nextCursor: AUCTION_ID,
    });

    expect(parsed.nextCursor).toBe(AUCTION_ID);
  });

  it('rejects a cursor that is not an auction id', () => {
    expect(
      listPublicAuctionsResponseSchema.safeParse({
        items: [],
        nextCursor: 'next-page',
      }).success,
    ).toBe(false);
  });

  it('rejects the whole page when one auction is malformed', () => {
    expect(
      listPublicAuctionsResponseSchema.safeParse({
        items: [summary(), summary({ currentPrice: '750' })],
        nextCursor: null,
      }).success,
    ).toBe(false);
  });
});

describe('publicAuctionDetailSchema', () => {
  it('accepts a live auction', () => {
    expect(publicAuctionDetailSchema.parse(detail())).toMatchObject({
      status: 'ACTIVE',
      endedAt: null,
      winner: null,
    });
  });

  it('accepts a sold auction with a winner and podium', () => {
    const parsed = publicAuctionDetailSchema.parse(
      detail({
        status: 'SOLD',
        endedAt: '2026-03-01T12:00:00.000Z',
        soldPrice: '750.00',
        winner: {
          id: SELLER_ID,
          displayName: 'A***n',
          avatarUrl: null,
        },
        podiumBids: [
          { sequenceNo: 3, amount: '750.00', bidderDisplayName: 'A***n' },
          { sequenceNo: 2, amount: '700.00', bidderDisplayName: 'S***i' },
        ],
      }),
    );

    expect(parsed.soldPrice).toBe('750.00');
    expect(parsed.podiumBids).toHaveLength(2);
  });

  it('drops a reserve price the API should never have sent', () => {
    const parsed = publicAuctionDetailSchema.parse(
      detail({ reservePrice: '900.00' }),
    );

    expect(parsed).not.toHaveProperty('reservePrice');
  });

  it('rejects a podium longer than three bids', () => {
    const podiumBids = [1, 2, 3, 4].map((sequenceNo) => ({
      sequenceNo,
      amount: '750.00',
      bidderDisplayName: 'A***n',
    }));

    expect(
      publicAuctionDetailSchema.safeParse(detail({ podiumBids })).success,
    ).toBe(false);
  });

  it('rejects a published auction with no images', () => {
    expect(
      publicAuctionDetailSchema.safeParse(detail({ images: [] })).success,
    ).toBe(false);
  });
});
