import { BadRequestException } from '@nestjs/common';

export function assertValidAuctionSchedule(
  scheduledStartAt: Date | null,
  scheduledEndAt: Date | null,
): void {
  const hasScheduledStart = scheduledStartAt !== null;
  const hasScheduledEnd = scheduledEndAt !== null;

  if (hasScheduledStart !== hasScheduledEnd) {
    throw new BadRequestException(
      'Scheduled start and end times must be supplied together',
    );
  }

  if (
    scheduledStartAt &&
    scheduledEndAt &&
    scheduledEndAt <= scheduledStartAt
  ) {
    throw new BadRequestException(
      'Scheduled end time must be later than start time',
    );
  }
}
