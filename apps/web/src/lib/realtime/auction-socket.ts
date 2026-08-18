"use client";

import { getAccessToken } from "@/lib/api/access-token.store";
import { apiBaseUrl } from "@/lib/api/api-client";
import { io, type Socket } from "socket.io-client";

let auctionSocket: Socket | null = null;

export function getAuctionSocket(): Socket {
  auctionSocket ??= io(`${apiBaseUrl}/auctions`, {
    auth: (callback) => {
      callback({
        accessToken: getAccessToken(),
      });
    },
    autoConnect: false,
    transports: ["websocket"],
    withCredentials: true,
  });

  return auctionSocket;
}

export function disconnectAuctionSocket(): void {
  auctionSocket?.disconnect();
  auctionSocket = null;
}
