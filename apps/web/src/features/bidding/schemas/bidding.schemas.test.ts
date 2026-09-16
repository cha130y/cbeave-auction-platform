import { describe, expect, it } from 'vitest';

import {
  bidAcceptedEventSchema,
  createPlaceBidFormSchema,
  listPublicBidsResponseSchema,
  placeBidResponseSchema,
} from './bidding.schemas';

const AUCTION_ID = '11111111-1111-4111-8111-111111111111';
const BID_ID = '22222222-2222-4222-8222-222222222222';
const CLIENT_REQUEST_ID = '33333333-3333-4333-8333-333333333333';

const acceptedBid = (overrides: Record<string, unknown> = {}) => ({
  id: BID_ID,
  auctionId: AUCTION_ID,
  clientRequestId: CLIENT_REQUEST_ID,
  amount: '750.00',
  sequenceNo: 3,
  placedAt: '2026-03-01T11:59:30.000Z',
  currentPrice: '750.00',
  bidCount: 3,
  reserveMet: true,
  currentEndAt: '2026-03-01T12:02:00.000Z',
  extension: null,
  ...overrides,
});

const extension = {
  extensionNumber: 2,
  previousEndAt: '2026-03-01T12:00:00.000Z',
  newEndAt: '2026-03-01T12:02:00.000Z',
};

describe('createPlaceBidFormSchema', () => {
  const schema = createPlaceBidFormSchema('800.00');

  it.each(['800.00', '800', '800.5', '1000', '12345.67'])(
    'accepts %s as at least the minimum',
    (amount) => {
      expect(schema.safeParse({ amount }).success).toBe(true);
    },
  );

  it.each(['799.99', '0.01', '100'])('rejects %s as below the minimum', (amount) => {
    const result = schema.safeParse({ amount });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Bid must be at least 800.00');
  });

  it.each([
    ['an empty amount', ''],
    ['zero', '0'],
    ['zero with cents', '0.00'],
    ['a negative amount', '-900'],
    ['three decimals', '900.123'],
    ['a thousands separator', '1,000'],
    ['letters', 'nine hundred'],
    ['a leading zero', '0900'],
  ])('rejects %s before comparing to the minimum', (_label, amount) => {
    const result = schema.safeParse({ amount });

    expect(result.success).toBe(false);
    // The format message wins, so the person is told what to type rather than
    // being shown a minimum they cannot act on yet.
    expect(result.error?.issues[0].message).toContain('positive amount');
  });

  it('trims surrounding whitespace before validating', () => {
    expect(schema.safeParse({ amount: '  900.00  ' }).success).toBe(true);
  });

  it('compares by value, not by string length', () => {
    const cheapSchema = createPlaceBidFormSchema('9.00');

    expect(cheapSchema.safeParse({ amount: '10.00' }).success).toBe(true);
  });
});

describe('placeBidResponseSchema', () => {
  it('accepts an accepted bid that did not extend the auction', () => {
    expect(placeBidResponseSchema.parse(acceptedBid())).toMatchObject({
      sequenceNo: 3,
      extension: null,
    });
  });

  it('accepts an accepted bid that extended the auction', () => {
    const parsed = placeBidResponseSchema.parse(acceptedBid({ extension }));

    expect(parsed.extension).toEqual(extension);
  });

  it('drops a bidder id the API should never have sent', () => {
    const parsed = placeBidResponseSchema.parse(
      acceptedBid({ bidderId: '99999999-9999-4999-8999-999999999999' }),
    );

    expect(parsed).not.toHaveProperty('bidderId');
  });

  it.each([
    ['a sequence number of zero', { sequenceNo: 0 }],
    ['a bid count of zero on an accepted bid', { bidCount: 0 }],
    ['a price without cents', { currentPrice: '750' }],
    ['a client request id that is not a UUID', { clientRequestId: 'retry-1' }],
    ['an extension numbered zero', { extension: { ...extension, extensionNumber: 0 } }],
  ])('rejects %s', (_label, override) => {
    expect(placeBidResponseSchema.safeParse(acceptedBid(override)).success).toBe(
      false,
    );
  });
});

describe('bidAcceptedEventSchema', () => {
  it('accepts the broadcast form, which carries no bid or bidder id', () => {
    const { id, clientRequestId, ...broadcast } = acceptedBid();

    expect(id).toBeDefined();
    expect(clientRequestId).toBeDefined();
    expect(bidAcceptedEventSchema.parse(broadcast)).toMatchObject({
      auctionId: AUCTION_ID,
      currentPrice: '750.00',
    });
  });

  it('rejects a broadcast missing the auction it belongs to', () => {
    const { auctionId, ...broadcast } = acceptedBid();

    expect(auctionId).toBeDefined();
    expect(bidAcceptedEventSchema.safeParse(broadcast).success).toBe(false);
  });
});

describe('listPublicBidsResponseSchema', () => {
  it('accepts a masked history page with a numeric cursor', () => {
    const parsed = listPublicBidsResponseSchema.parse({
      items: [
        {
          sequenceNo: 2,
          amount: '700.00',
          placedAt: '2026-03-01T11:00:00.000Z',
          bidderDisplayName: 'S***i',
        },
      ],
      nextCursor: 2,
    });

    expect(parsed.nextCursor).toBe(2);
  });

  it('accepts an empty history', () => {
    expect(
      listPublicBidsResponseSchema.parse({ items: [], nextCursor: null }),
    ).toEqual({ items: [], nextCursor: null });
  });

  it('rejects a cursor sent as a string', () => {
    expect(
      listPublicBidsResponseSchema.safeParse({ items: [], nextCursor: '2' })
        .success,
    ).toBe(false);
  });

  it('rejects a history entry with an unmasked empty name', () => {
    expect(
      listPublicBidsResponseSchema.safeParse({
        items: [
          {
            sequenceNo: 1,
            amount: '700.00',
            placedAt: '2026-03-01T11:00:00.000Z',
            bidderDisplayName: '',
          },
        ],
        nextCursor: null,
      }).success,
    ).toBe(false);
  });
});
