/**
 * The message to show a person for a failed request. `ApiError` carries the
 * sentence the API sent, which is the most specific thing available; anything
 * else that reached the catch is unexpected here, so the caller's fallback
 * names the action that failed instead.
 */
export function readErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
