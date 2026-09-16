import { describe, expect, it } from 'vitest';

import {
  activeArenaStateSchema,
  auctionEndedEventSchema,
  auctionExtendedEventSchema,
  auctionParticipationSchema,
  auctionStartedEventSchema,
} from './live-arena.schemas';

const AUCTION_ID = '11111111-1111-4111-8111-111111111111';

const arenaState = (overrides: Record<string, unknown> = {}) => ({
  auctionId: AUCTION_ID,
  title: 'Vintage diving watch',
  status: 'ACTIVE',
  currency: 'THB',
  currentPrice: '750.00',
  minimumNextBid: '800.00',
  bidCount: 3,
  reserveMet: true,
  startedAt: '2026-03-01T10:00:00.000Z',
  currentEndAt: '2026-03-01T12:00:00.000Z',
  extensionCount: 1,
  participantCount: 12,
  canBid: true,
  isCurrentUserLeading: false,
  leader: { bidderDisplayName: 'A***n', amount: '750.00' },
  recentBids: [
    {
      sequenceNo: 1,
      amount: '700.00',
      placedAt: '2026-03-01T11:00:00.000Z',
      bidderDisplayName: 'S***i',
    },
  ],
  ...overrides,
});

const extendedEvent = (overrides: Record<string, unknown> = {}) => ({
  auctionId: AUCTION_ID,
  extensionNumber: 2,
  previousEndAt: '2026-03-01T12:00:00.000Z',
  newEndAt: '2026-03-01T12:02:00.000Z',
  extensionSeconds: 120,
  triggeringBid: {
    amount: '750.00',
    sequenceNo: 3,
    placedAt: '2026-03-01T11:59:30.000Z',
  },
  ...overrides,
});

const endedEvent = (overrides: Record<string, unknown> = {}) => ({
  auctionId: AUCTION_ID,
  status: 'SOLD',
  currency: 'THB',
  finalPrice: '750.00',
  bidCount: 3,
  reserveMet: true,
  endedAt: '2026-03-01T12:02:00.000Z',
  winnerDisplayName: 'A***n',
  podiumBids: [{ sequenceNo: 3, amount: '750.00', bidderDisplayName: 'A***n' }],
  ...overrides,
});

describe('activeArenaStateSchema', () => {
  it('accepts a running arena with a leader', () => {
    expect(activeArenaStateSchema.parse(arenaState())).toMatchObject({
      minimumNextBid: '800.00',
      participantCount: 12,
      canBid: true,
    });
  });

  it('accepts an arena before its first bid', () => {
    const parsed = activeArenaStateSchema.parse(
      arenaState({
        bidCount: 0,
        leader: null,
        recentBids: [],
        isCurrentUserLeading: false,
      }),
    );

    expect(parsed.leader).toBeNull();
    expect(parsed.recentBids).toEqual([]);
  });

  it('drops a reserve price the API should never have sent', () => {
    const parsed = activeArenaStateSchema.parse(
      arenaState({ reservePrice: '900.00' }),
    );

    expect(parsed).not.toHaveProperty('reservePrice');
  });

  it('drops a bidder id the API should never have sent', () => {
    const parsed = activeArenaStateSchema.parse(
      arenaState({
        leader: {
          bidderDisplayName: 'A***n',
          amount: '750.00',
          bidderId: '99999999-9999-4999-8999-999999999999',
        },
      }),
    );

    expect(parsed.leader).not.toHaveProperty('bidderId');
  });

  it.each([
    ['a non-active status', { status: 'SOLD' }],
    ['a price without cents', { currentPrice: '750' }],
    ['a negative participant count', { participantCount: -1 }],
    ['a negative extension count', { extensionCount: -1 }],
    ['a missing canBid flag', { canBid: undefined }],
    ['an empty leader name', { leader: { bidderDisplayName: '', amount: '750.00' } }],
  ])('rejects %s', (_label, override) => {
    expect(activeArenaStateSchema.safeParse(arenaState(override)).success).toBe(
      false,
    );
  });
});

describe('auctionParticipationSchema', () => {
  it('accepts an empty lobby', () => {
    expect(
      auctionParticipationSchema.parse({
        auctionId: AUCTION_ID,
        participantCount: 0,
      }),
    ).toEqual({ auctionId: AUCTION_ID, participantCount: 0 });
  });

  it('rejects a participant count that is not a whole number', () => {
    expect(
      auctionParticipationSchema.safeParse({
        auctionId: AUCTION_ID,
        participantCount: 2.5,
      }).success,
    ).toBe(false);
  });
});

describe('auctionStartedEventSchema', () => {
  it('accepts the scheduled-to-active transition', () => {
    expect(
      auctionStartedEventSchema.parse({
        auctionId: AUCTION_ID,
        status: 'ACTIVE',
        startedAt: '2026-03-01T10:00:00.000Z',
        currentEndAt: '2026-03-01T12:00:00.000Z',
      }).status,
    ).toBe('ACTIVE');
  });

  it('rejects any status other than ACTIVE', () => {
    expect(
      auctionStartedEventSchema.safeParse({
        auctionId: AUCTION_ID,
        status: 'SCHEDULED',
        startedAt: '2026-03-01T10:00:00.000Z',
        currentEndAt: '2026-03-01T12:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

describe('auctionExtendedEventSchema', () => {
  it('accepts a sudden-death extension with its triggering bid', () => {
    expect(auctionExtendedEventSchema.parse(extendedEvent())).toMatchObject({
      extensionNumber: 2,
      extensionSeconds: 120,
    });
  });

  it.each([
    ['extension number zero', { extensionNumber: 0 }],
    ['a negative extension number', { extensionNumber: -1 }],
    ['a zero-second extension', { extensionSeconds: 0 }],
    ['a fractional extension', { extensionSeconds: 119.5 }],
    ['a missing triggering bid', { triggeringBid: undefined }],
  ])('rejects %s', (_label, override) => {
    expect(
      auctionExtendedEventSchema.safeParse(extendedEvent(override)).success,
    ).toBe(false);
  });
});

describe('auctionEndedEventSchema', () => {
  it('accepts a sold result with a masked winner', () => {
    expect(auctionEndedEventSchema.parse(endedEvent())).toMatchObject({
      status: 'SOLD',
      winnerDisplayName: 'A***n',
    });
  });

  it('accepts an unsold result with no winner', () => {
    const parsed = auctionEndedEventSchema.parse(
      endedEvent({
        status: 'UNSOLD',
        reserveMet: false,
        winnerDisplayName: null,
        podiumBids: [],
      }),
    );

    expect(parsed.winnerDisplayName).toBeNull();
    expect(parsed.podiumBids).toEqual([]);
  });

  it('rejects a status the arena cannot render', () => {
    expect(
      auctionEndedEventSchema.safeParse(endedEvent({ status: 'CANCELLED' }))
        .success,
    ).toBe(false);
  });

  it('rejects a podium longer than three bids', () => {
    const podiumBids = [1, 2, 3, 4].map((sequenceNo) => ({
      sequenceNo,
      amount: '750.00',
      bidderDisplayName: 'A***n',
    }));

    expect(
      auctionEndedEventSchema.safeParse(endedEvent({ podiumBids })).success,
    ).toBe(false);
  });
});
