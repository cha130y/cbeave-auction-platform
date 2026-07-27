import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Socket, Server } from 'socket.io';
import {
  AuctionRoomInput,
  AuctionRoomResponse,
} from '../types/auction-room.input';
import { isUUID } from 'class-validator';
import { Logger } from '@nestjs/common';
import { BidAcceptedEventDto } from '../dto/bid-accepted-event.dto';

@WebSocketGateway({
  namespace: '/auctions',
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class AuctionBiddingGateway {
  private readonly logger = new Logger(AuctionBiddingGateway.name);

  @WebSocketServer()
  private server: Server;

  @SubscribeMessage('auction:join')
  async joinAuctionRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AuctionRoomInput | undefined,
  ): Promise<AuctionRoomResponse> {
    const auctionId = this.requireAuctionId(payload);

    await client.join(this.createRoomName(auctionId));

    return { auctionId };
  }

  @SubscribeMessage('auction:leave')
  async leaveAuctionRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AuctionRoomInput | undefined,
  ): Promise<AuctionRoomResponse> {
    const auctionId = this.requireAuctionId(payload);

    await client.leave(this.createRoomName(auctionId));

    return { auctionId };
  }

  broadcastAcceptedBid(event: BidAcceptedEventDto): void {
    try {
      this.server
        .to(this.createRoomName(event.auctionId))
        .emit('auction:bid-accepted', event);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to broadcast accepted bid for auction ${event.auctionId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private createRoomName(auctionId: string): string {
    return `auction:${auctionId}`;
  }
  private requireAuctionId(payload: AuctionRoomInput | undefined): string {
    const auctionId = payload?.auctionId;

    if (typeof auctionId !== 'string' || !isUUID(auctionId, '4')) {
      throw new WsException('Invalid auction ID');
    }
    return auctionId;
  }
}
