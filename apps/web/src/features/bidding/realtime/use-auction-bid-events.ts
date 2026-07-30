'use client';

import { auctionQueryKeys } from '@/features/auctions/queries/auction.queries';
import { biddingQueryKeys } from '@/features/bidding/queries/bidding.queries';
import { bidAcceptedEventSchema } from '@/features/bidding/schemas/bidding.schemas';
import { watchlistQueryKeys } from '@/features/watchlists/queries/watchlist.queries';
import { getAuctionSocket } from '@/lib/realtime/auction-socket';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export function useAuctionBidEvents(auctionId: string, enabled: boolean): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const socket = getAuctionSocket();

    const joinAuction = () => {
      socket.emit('auction:join', {
        auctionId,
      });
    };

    const handleBidAccepted = (payload: unknown) => {
      const result = bidAcceptedEventSchema.safeParse(payload);

      if (!result.success || result.data.auctionId !== auctionId) {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: auctionQueryKeys.all,
      });

      void queryClient.invalidateQueries({
        queryKey: biddingQueryKeys.histories(),
      });

      void queryClient.invalidateQueries({
        queryKey: watchlistQueryKeys.all,
      });
    };

    socket.on('connect', joinAuction);
    socket.on('auction:bid-accepted', handleBidAccepted);

    if (socket.connected) {
      joinAuction();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', joinAuction);
      socket.off('auction:bid-accepted', handleBidAccepted);

      if (socket.connected) {
        socket.emit('auction:leave', {
          auctionId,
        });
      }
    };
  }, [auctionId, enabled, queryClient]);
}
