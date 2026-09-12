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
import { createSocketRetry } from './create-socket-retry';
import { parseAuctionPayload } from './parse-auction-payload';

const JOIN_RETRY_DELAY_MS = 1_500;

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

    const retry = createSocketRetry({
      socket,
      isActive: () => mounted,
      onRetry: () => joinAuction(),
    });

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
            retry.schedule(JOIN_RETRY_DELAY_MS);
            return;
          }

          //This protects the frontend from malformed or unexpected socket data
          const participation = parseAuctionPayload(
            auctionParticipationSchema,
            payload,
            auctionId,
          );

          if (!participation) {
            setConnectionStatus('error');
            setErrorMessage(
              'The Live Arena returned an invalid lobby response.',
            );
            retry.schedule(JOIN_RETRY_DELAY_MS);
            return;
          }

          retry.clear();
          joined = true;
          setParticipantCount(participation.participantCount);
          setConnectionStatus('connected');
        },
      );
    };

    const handleParticipantCount = (payload: unknown) => {
      const participation = parseAuctionPayload(
        auctionParticipationSchema,
        payload,
        auctionId,
      );

      if (!participation) {
        return;
      }

      setParticipantCount(participation.participantCount);
    };

    const handleAuctionStarted = (payload: unknown) => {
      //prevents an event from another auction room from changing this lobby.
      const started = parseAuctionPayload(
        auctionStartedEventSchema,
        payload,
        auctionId,
      );

      if (!started) {
        return;
      }

      retry.clear();
      setErrorMessage(null);
      setConnectionStatus('connected');
      setStartedEvent(started);
    };

    const handleAuctionEnded = (payload: unknown) => {
      const ended = parseAuctionPayload(
        auctionEndedEventSchema,
        payload,
        auctionId,
      );

      if (!ended) {
        return;
      }

      setEndedEvent(ended);
    };

    const handleConnectionError = () => {
      setConnectionStatus('error');
      setErrorMessage(
        'The Live Arena is reconnecting. No refresh is required.',
      );
    };

    const handleDisconnect = () => {
      joined = false;
      joinInFlight = false;
      retry.clear();
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
      retry.clear();

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
