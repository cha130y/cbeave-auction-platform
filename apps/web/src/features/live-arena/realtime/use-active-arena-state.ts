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
import { createSocketRetry } from './create-socket-retry';
import { parseAuctionPayload } from './parse-auction-payload';

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

    const retry = createSocketRetry({
      socket,
      isActive: () => mounted,
      onRetry: () => requestState(),
    });

    const handleRequestFailure = (message: string) => {
      failedAttempts += 1;

      if (failedAttempts >= 3) {
        setStatus('error');
        setErrorMessage(message);
      } else {
        setStatus('loading');
      }

      retry.schedule(failedAttempts >= 3 ? 2_000 : 750);
    };

    const requestState = () => {
      if (!mounted) {
        return;
      }

      if (!socket.connected) {
        retry.schedule(500);
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

          const arena = parseAuctionPayload(
            activeArenaStateSchema,
            payload,
            auctionId,
          );

          if (!arena) {
            handleRequestFailure(
              'The Live Arena returned an invalid auction state.',
            );
            return;
          }

          retry.clear();
          failedAttempts = 0;
          hasLoadedState = true;
          setArenaState(arena);
          setStatus('success');

          if (refreshQueued) {
            refreshQueued = false;
            requestState();
          }
        },
      );
    };

    const handleBidAccepted = (payload: unknown) => {
      if (!parseAuctionPayload(bidAcceptedEventSchema, payload, auctionId)) {
        return;
      }

      //run this method when user place a accepted bid
      requestState();
    };

    const handleAuctionExtended = (payload: unknown) => {
      const extension = parseAuctionPayload(
        auctionExtendedEventSchema,
        payload,
        auctionId,
      );

      if (!extension) {
        return;
      }

      setLatestExtension(extension);
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
      retry.clear();
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
