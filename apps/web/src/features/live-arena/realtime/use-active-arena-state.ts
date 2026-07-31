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

    const requestState = () => {
      setStatus('loading');
      setErrorMessage(null);

      socket.timeout(5_000).emit(
        'auction:state',
        {
          auctionId,
        },
        (error: Error | null, payload: unknown) => {
          if (!mounted) {
            return;
          }

          if (error) {
            setStatus('error');
            setErrorMessage(
              'The active auction state could not be loaded. Please try again.',
            );
            return;
          }

          const result = activeArenaStateSchema.safeParse(payload);

          if (!result.success || result.data.auctionId !== auctionId) {
            setStatus('error');
            setErrorMessage(
              'The Live Arena returned an invalid auction state.',
            );
            return;
          }

          setArenaState(result.data);
          setStatus('success');
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
    };

    //Whenever the server sends an auction:bid-accepted event through this socket, call handleBidAccepted
    socket.on('auction:bid-accepted', handleBidAccepted);
    socket.on('auction:extended', handleAuctionExtended);

    //run this method when enter the room/ refresh page
    requestState();

    //clean up the event listener when
    // the component unmounts;
    // auctionId changes;
    // enabled changes;
    // the effect needs to register a new listener.
    return () => {
      mounted = false;
      //Stop calling this particular handleBidAccepted function for this event
      socket.off('auction:bid-accepted', handleBidAccepted);
      socket.off('auction:extended', handleAuctionExtended);
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
