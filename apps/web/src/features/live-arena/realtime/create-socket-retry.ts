import type { Socket } from 'socket.io-client';

type CreateSocketRetryOptions = {
  socket: Socket;
  /** Guards against scheduling once the owning effect has been cleaned up. */
  isActive: () => boolean;
  /** Runs when the retry fires and the socket is already connected. */
  onRetry: () => void;
};

/**
 * Single pending-retry timer: scheduling while one is already pending is a
 * no-op, and a fired retry either re-runs the action or reconnects the socket
 * (the reconnect then re-triggers the caller's own `connect` handler).
 */
export function createSocketRetry({
  socket,
  isActive,
  onRetry,
}: CreateSocketRetryOptions) {
  let retryTimer: number | null = null;

  const clear = () => {
    if (retryTimer !== null) {
      window.clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const schedule = (delayMs: number) => {
    if (!isActive() || retryTimer !== null) {
      return;
    }

    retryTimer = window.setTimeout(() => {
      retryTimer = null;

      if (socket.connected) {
        onRetry();
      } else {
        socket.connect();
      }
    }, delayMs);
  };

  return { clear, schedule };
}
