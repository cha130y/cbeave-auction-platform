import { BadRequestException } from '@nestjs/common';
import { assertValidAuctionSchedule } from './assert-valid-auction-schedule.util';

describe('assertValidAuctionSchedule', () => {
  const start = new Date('2026-01-01T10:00:00.000Z');
  const end = new Date('2026-01-01T12:00:00.000Z');

  it('accepts a draft without a schedule', () => {
    expect(() => assertValidAuctionSchedule(null, null)).not.toThrow();
  });

  it('accepts an end time later than the start time', () => {
    expect(() => assertValidAuctionSchedule(start, end)).not.toThrow();
  });

  it('rejects a start time without an end time', () => {
    expect(() => assertValidAuctionSchedule(start, null)).toThrow(
      BadRequestException,
    );

    expect(() => assertValidAuctionSchedule(start, null)).toThrow(
      'Scheduled start and end times must be supplied together',
    );
  });

  it('rejects an end time without a start time', () => {
    expect(() => assertValidAuctionSchedule(null, end)).toThrow(
      'Scheduled start and end times must be supplied together',
    );
  });

  it('rejects an end time equal to the start time', () => {
    expect(() =>
      assertValidAuctionSchedule(start, new Date(start.getTime())),
    ).toThrow('Scheduled end time must be later than start time');
  });

  it('rejects an end time earlier than the start time', () => {
    expect(() => assertValidAuctionSchedule(end, start)).toThrow(
      'Scheduled end time must be later than start time',
    );
  });
});
