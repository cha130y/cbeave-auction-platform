export function cursorPagination<
  TPage extends { nextCursor: string | null },
>() {
  return {
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: TPage) => lastPage.nextCursor ?? undefined,
  };
}
