import { describe, expect, it } from 'vitest';

import { cursorPagination } from './cursor-pagination';

type Page = { nextCursor: string | null };

describe('cursorPagination', () => {
  const pagination = cursorPagination<Page>();

  it('starts without a cursor', () => {
    expect(pagination.initialPageParam).toBeNull();
  });

  it('hands the next cursor to the following page', () => {
    expect(
      pagination.getNextPageParam({ nextCursor: 'next-auction-id' }),
    ).toBe('next-auction-id');
  });

  it('stops paging when the API returns no cursor', () => {
    // TanStack Query treats undefined as "no further pages"; returning null
    // here would keep the Load more control enabled forever.
    expect(pagination.getNextPageParam({ nextCursor: null })).toBeUndefined();
  });
});
