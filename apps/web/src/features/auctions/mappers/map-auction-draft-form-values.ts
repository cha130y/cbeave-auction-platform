import {
  AuctionDraft,
  AuctionDraftFormValues,
} from '@/features/auctions/schemas/auction-draft.schemas';
import type { CreateAuctionDraftInput } from '@/features/auctions/api/auctions.api';

function toDateTimeLocal(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const timezoneOffsetMilliseconds = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffsetMilliseconds)
    .toISOString()
    .slice(0, 16);
}

function toApiDateTime(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function mapAuctionDraftInput(
  values: AuctionDraftFormValues,
): CreateAuctionDraftInput {
  return {
    categoryId: values.categoryId,
    title: values.title.trim(),
    description: values.description.trim(),
    startingPrice: values.startingPrice.trim(),
    reservePrice: values.reservePrice.trim() || null,
    minBidIncrement: values.minBidIncrement.trim(),
    scheduledStartAt: toApiDateTime(values.scheduledStartAt),
    scheduledEndAt: toApiDateTime(values.scheduledEndAt),
  };
}

export function mapAuctionDraftFormValues(
  draft: AuctionDraft,
): AuctionDraftFormValues {
  return {
    categoryId: draft.categoryId,
    title: draft.title,
    description: draft.description,
    startingPrice: draft.startingPrice,
    reservePrice: draft.reservePrice ?? '',
    minBidIncrement: draft.minBidIncrement,
    scheduledStartAt: toDateTimeLocal(draft.scheduledStartAt),
    scheduledEndAt: toDateTimeLocal(draft.originalEndAt),
  };
}
