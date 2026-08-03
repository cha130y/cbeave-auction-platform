'use client';

import {
  auctionParticipationSchema,
  auctionStartedEventSchema,
  type AuctionStartedEvent,
  type AuctionEndedEvent,
  auctionEndedEventSchema,
} from '@/features/live-arena/schemas/live-arena.schemas';
import { getAuctionSocket } from '@/lib/realtime/auction-socket';
import { useEffect, useState } from 'react';

type LobbyConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

type AuctionLobbyState = {
  connectionStatus: LobbyConnectionStatus;
  errorMessage: string | null;
  participantCount: number;
  startedEvent: AuctionStartedEvent | null;
  endedEvent: AuctionEndedEvent | null;
};
export function useAuctionLobby(
  auctionId: string,
  //enable it only for an authenticated user viewing an eligible auction
  enabled: boolean,
): AuctionLobbyState {
  const [connectionStatus, setConnectionStatus] =
    useState<LobbyConnectionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [startedEvent, setStartedEvent] = useState<AuctionStartedEvent | null>(
    null,
  );
  const [endedEvent, setEndedEvent] = useState<AuctionEndedEvent | null>(null);

  //run when auctionId or enabled changes
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const socket = getAuctionSocket();

    let joined = false;
    let joinInFlight = false;
    let mounted = true;
    let retryTimer: number | null = null;

    const clearRetry = () => {
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const scheduleJoinRetry = () => {
      if (!mounted || retryTimer !== null) {
        return;
      }

      retryTimer = window.setTimeout(() => {
        retryTimer = null;

        if (socket.connected) {
          joinAuction();
        } else {
          socket.connect();
        }
      }, 1_500);
    };

    const joinAuction = () => {
      if (joinInFlight) {
        return;
      }

      joinInFlight = true;
      setConnectionStatus('connecting');
      setErrorMessage(null);

      socket.timeout(5_000).emit(
        'auction:join',
        {
          auctionId,
        },
        (error: Error | null, payload: unknown) => {
          joinInFlight = false;

          if (!mounted) {
            return;
          }

          if (error) {
            setConnectionStatus('error');
            setErrorMessage(
              'The Live Arena is reconnecting. No refresh is required.',
            );
            scheduleJoinRetry();
            return;
          }

          //This protects the frontend from malformed or unexpected socket data
          const result = auctionParticipationSchema.safeParse(payload);

          if (!result.success || result.data.auctionId !== auctionId) {
            setConnectionStatus('error');
            setErrorMessage(
              'The Live Arena returned an invalid lobby response.',
            );
            scheduleJoinRetry();
            return;
          }

          clearRetry();
          joined = true;
          setParticipantCount(result.data.participantCount);
          setConnectionStatus('connected');
        },
      );
    };

    const handleParticipantCount = (payload: unknown) => {
      const result = auctionParticipationSchema.safeParse(payload);

      if (!result.success || result.data.auctionId !== auctionId) {
        return;
      }

      setParticipantCount(result.data.participantCount);
    };

    const handleAuctionStarted = (payload: unknown) => {
      const result = auctionStartedEventSchema.safeParse(payload);

      //prevents an event from another auction room from changing this lobby.
      if (!result.success || result.data.auctionId !== auctionId) {
        return;
      }

      clearRetry();
      setErrorMessage(null);
      setConnectionStatus('connected');
      setStartedEvent(result.data);
    };

    const handleAuctionEnded = (payload: unknown) => {
      const result = auctionEndedEventSchema.safeParse(payload);

      if (!result.success || result.data.auctionId !== auctionId) {
        return;
      }

      setEndedEvent(result.data);
    };

    const handleConnectionError = () => {
      setConnectionStatus('error');
      setErrorMessage('The Live Arena is reconnecting. No refresh is required.');
    };

    const handleDisconnect = () => {
      joined = false;
      joinInFlight = false;
      clearRetry();
      setConnectionStatus('connecting');
    };

    //calls joinAuction whenever the socket connects or reconnects.
    socket.on('connect', joinAuction);
    socket.on('disconnect', handleDisconnect);
    socket.on('auction:participant-count', handleParticipantCount);
    socket.on('auction:started', handleAuctionStarted);
    socket.on('auction:ended', handleAuctionEnded);
    socket.on('connect_error', handleConnectionError);

    //If the socket is already connected, the hook joins immediately
    if (socket.connected) {
      joinAuction();
    } else {
      socket.connect();
    }

    return () => {
      mounted = false;
      clearRetry();

      //socket.off use for remove listener
      socket.off('connect', joinAuction);
      socket.off('disconnect', handleDisconnect);
      socket.off('auction:participant-count', handleParticipantCount);
      socket.off('auction:started', handleAuctionStarted);
      socket.off('auction:ended', handleAuctionEnded);
      socket.off('connect_error', handleConnectionError);

      if (joined && socket.connected) {
        //Send an event to the server.
        socket.emit('auction:leave', {
          auctionId,
        });
      }
    };
  }, [auctionId, enabled]);

  return {
    connectionStatus: enabled ? connectionStatus : 'idle',
    errorMessage: enabled ? errorMessage : null,
    participantCount: enabled ? participantCount : 0,
    startedEvent:
      enabled && startedEvent?.auctionId === auctionId ? startedEvent : null,
    endedEvent:
      enabled && endedEvent?.auctionId === auctionId ? endedEvent : null,
  };
}
