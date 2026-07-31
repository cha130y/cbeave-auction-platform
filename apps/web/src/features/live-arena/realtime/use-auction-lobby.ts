'use client';

import {
  auctionParticipationSchema,
  auctionStartedEventSchema,
  type AuctionStartedEvent,
} from '@/features/live-arena/schemas/live-arena.schemas';
import { getAuctionSocket } from '@/lib/realtime/auction-socket';
import { useEffect, useState } from 'react';

type LobbyConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

type AuctionLobbyState = {
  connectionStatus: LobbyConnectionStatus;
  errorMessage: string | null;
  participantCount: number;
  startedEvent: AuctionStartedEvent | null;
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

  //run when auctionId or enabled changes
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const socket = getAuctionSocket();

    let joined = false;
    let mounted = true;

    const joinAuction = () => {
      setConnectionStatus('connecting');
      setErrorMessage(null);

      socket.timeout(5_000).emit(
        'auction:join',
        {
          auctionId,
        },
        (error: Error | null, payload: unknown) => {
          if (!mounted) {
            return;
          }

          if (error) {
            setConnectionStatus('error');
            setErrorMessage(
              'The Live Arena connection timed out. Please try again.',
            );
            return;
          }

          //This protects the frontend from malformed or unexpected socket data
          const result = auctionParticipationSchema.safeParse(payload);

          if (!result.success || result.data.auctionId !== auctionId) {
            setConnectionStatus('error');
            setErrorMessage(
              'The Live Arena returned an invalid lobby response.',
            );
            return;
          }

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

      setStartedEvent(result.data);
    };

    const handleConnectionError = () => {
      setConnectionStatus('error');
      setErrorMessage('The Live Arena connection could not be established.');
    };

    const handleDisconnect = () => {
      joined = false;
      setConnectionStatus('connecting');
    };

    //calls joinAuction whenever the socket connects or reconnects.
    socket.on('connect', joinAuction);
    socket.on('disconnect', handleDisconnect);
    socket.on('auction:participant-count', handleParticipantCount);
    socket.on('auction:started', handleAuctionStarted);
    socket.on('connect_error', handleConnectionError);

    //If the socket is already connected, the hook joins immediately
    if (socket.connected) {
      joinAuction();
    } else {
      socket.connect();
    }

    return () => {
      mounted = false;

      //socket.off use for remove listener
      socket.off('connect', joinAuction);
      socket.off('disconnect', handleDisconnect);
      socket.off('auction:participant-count', handleParticipantCount);
      socket.off('auction:started', handleAuctionStarted);
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
    startedEvent: enabled ? startedEvent : null,
  };
}
