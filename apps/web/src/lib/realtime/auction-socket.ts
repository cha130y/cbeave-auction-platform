"use client";

import { publicEnv } from "@/config/public-env";
import { getAccessToken } from "@/lib/api/access-token.store";
import { io, type Socket } from "socket.io-client";

let auctionSocket: Socket | null = null;

export function getAuctionSocket(): Socket {
  auctionSocket ??= io(
    `${publicEnv.NEXT_PUBLIC_API_URL.replace(/\/+$/, "")}/auctions`,
    {
      auth: (callback) => {
        callback({
          accessToken: getAccessToken(),
        });
      },
      autoConnect: false,
      transports: ["websocket"],
      withCredentials: true,
    },
  );

  return auctionSocket;
}

export function disconnectAuctionSocket(): void {
  auctionSocket?.disconnect();
  auctionSocket = null;
}
