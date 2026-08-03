'use client';

import { bidAcceptedEventSchema } from '@/features/bidding/schemas/bidding.schemas';
import {
  activeArenaStateSchema,
  auctionExtendedEventSchema,
  type ActiveArenaState,
  type AuctionExtendedEvent,
} from '@/features/live-arena/schemas/live-arena.schemas';
import { getAuctionSocket } from '@/lib/realtime/auction-socket';
import { useEffect, useState } from 'react';

type ActiveArenaStateStatus = 'idle' | 'loading' | 'success' | 'error';

type UseActiveArenaStateResult = {
  status: ActiveArenaStateStatus;
  errorMessage: string | null;
  arenaState: ActiveArenaState | null;
  latestExtension: AuctionExtendedEvent | null;
};

export function useActiveArenaState(
  auctionId: string,
  enabled: boolean,
): UseActiveArenaStateResult {
  const [status, setStatus] = useState<ActiveArenaStateStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [arenaState, setArenaState] = useState<ActiveArenaState | null>(null);
  const [latestExtension, setLatestExtension] =
    useState<AuctionExtendedEvent | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const socket = getAuctionSocket();
    let mounted = true;
    let hasLoadedState = false;
    let requestInFlight = false;
    let refreshQueued = false;
    let failedAttempts = 0;
    let retryTimer: number | null = null;

    const clearRetry = () => {
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const scheduleRetry = (delay: number) => {
      if (!mounted || retryTimer !== null) {
        return;
      }

      retryTimer = window.setTimeout(() => {
        retryTimer = null;

        if (socket.connected) {
          requestState();
        } else {
          socket.connect();
        }
      }, delay);
    };

    const handleRequestFailure = (message: string) => {
      failedAttempts += 1;

      if (failedAttempts >= 3) {
        setStatus('error');
        setErrorMessage(message);
      } else {
        setStatus('loading');
      }

      scheduleRetry(failedAttempts >= 3 ? 2_000 : 750);
    };

    const requestState = () => {
      if (!mounted) {
        return;
      }

      if (!socket.connected) {
        scheduleRetry(500);
        return;
      }

      if (requestInFlight) {
        refreshQueued = true;
        return;
      }

      requestInFlight = true;

      if (!hasLoadedState) {
        setStatus('loading');
      }

      setErrorMessage(null);

      socket.timeout(3_000).emit(
        'auction:state',
        {
          auctionId,
        },
        (error: Error | null, payload: unknown) => {
          requestInFlight = false;

          if (!mounted) {
            return;
          }

          if (error) {
            handleRequestFailure(
              'The active auction state could not be loaded. Please try again.',
            );
            return;
          }

          const result = activeArenaStateSchema.safeParse(payload);

          if (!result.success || result.data.auctionId !== auctionId) {
            handleRequestFailure(
              'The Live Arena returned an invalid auction state.',
            );
            return;
          }

          clearRetry();
          failedAttempts = 0;
          hasLoadedState = true;
          setArenaState(result.data);
          setStatus('success');

          if (refreshQueued) {
            refreshQueued = false;
            requestState();
          }
        },
      );
    };

    const handleBidAccepted = (payload: unknown) => {
      const result = bidAcceptedEventSchema.safeParse(payload);

      if (!result.success || result.data.auctionId !== auctionId) {
        return;
      }

      //run this method when user place a accepted bid
      requestState();
    };

    const handleAuctionExtended = (payload: unknown) => {
      const result = auctionExtendedEventSchema.safeParse(payload);

      if (!result.success || result.data.auctionId !== auctionId) {
        return;
      }

      setLatestExtension(result.data);
      requestState();
    };

    const handleConnect = () => {
      requestState();
    };

    //Whenever the server sends an auction:bid-accepted event through this socket, call handleBidAccepted
    socket.on('auction:bid-accepted', handleBidAccepted);
    socket.on('auction:extended', handleAuctionExtended);
    socket.on('connect', handleConnect);

    //run this method when enter the room/ refresh page
    if (socket.connected) {
      requestState();
    } else {
      socket.connect();
    }

    //clean up the event listener when
    // the component unmounts;
    // auctionId changes;
    // enabled changes;
    // the effect needs to register a new listener.
    return () => {
      mounted = false;
      clearRetry();
      //Stop calling this particular handleBidAccepted function for this event
      socket.off('auction:bid-accepted', handleBidAccepted);
      socket.off('auction:extended', handleAuctionExtended);
      socket.off('connect', handleConnect);
    };
  }, [auctionId, enabled]);

  return {
    status: enabled ? status : 'idle',
    errorMessage: enabled ? errorMessage : null,
    arenaState: enabled ? arenaState : null,
    latestExtension:
      enabled && latestExtension?.auctionId === auctionId
        ? latestExtension
        : null,
  };
}
