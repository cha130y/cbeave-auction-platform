const ANTI_SNIPING_WINDOW_MS = 2 * 60 * 1000;
const ANTI_SNIPING_EXTENSION_MS = 2 * 60 * 1000;
const MAX_AUCTION_EXTENSIONS = 5;

export type AntiSnipingExtension = {
  shouldExtend: boolean;
  previousEndAt: Date;
  newEndAt: Date;
};

/**
 * A bid landing in the final two minutes pushes the deadline two minutes out,
 * so nobody wins by arriving too late to be answered. The extension is granted
 * at most five times, which bounds how long one auction can be held open.
 *
 * `newEndAt` is the deadline to persist either way, so the caller can write it
 * without asking whether an extension was granted.
 */
export function resolveAntiSnipingExtension(
  currentEndAt: Date,
  extensionCount: number,
  now: Date,
): AntiSnipingExtension {
  const remainingTimeMs = currentEndAt.getTime() - now.getTime();

  const shouldExtend =
    remainingTimeMs <= ANTI_SNIPING_WINDOW_MS &&
    extensionCount < MAX_AUCTION_EXTENSIONS;

  return {
    shouldExtend,
    previousEndAt: currentEndAt,
    newEndAt: shouldExtend
      ? new Date(currentEndAt.getTime() + ANTI_SNIPING_EXTENSION_MS)
      : currentEndAt,
  };
}
