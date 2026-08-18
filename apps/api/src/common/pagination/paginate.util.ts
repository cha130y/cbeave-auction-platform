export function paginate<T, C>(
  items: T[],
  limit: number,
  cursorOf: (item: T) => C,
): { page: T[]; nextCursor: C | null } {
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  const lastItem = page[page.length - 1];

  return {
    page,
    nextCursor: hasMore && lastItem ? cursorOf(lastItem) : null,
  };
}
