import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import type { Socket, Server } from 'socket.io';
import {
  AuctionRoomInput,
  AuctionRoomResponse,
} from '../types/auction-room.input';
import { isUUID } from 'class-validator';
import { Logger } from '@nestjs/common';
import { BidAcceptedEventDto } from '../dto/bid-accepted-event.dto';
import { SocketAuthenticationService } from '../../auth/services/socket-authentication.service';
import { AuctionParticipantsService } from '../services/auction-participants.service';
import { AuctionStartedEventDto } from '../dto/auction-started-event.dto';
import { ActiveArenaService } from '../services/active-arena.service';
import { ActiveArenaStateDto } from '../dto/active-arena-state.dto';
import { mapAuctionExtendedEvent } from '../mappers/map-auction-extended-event.mapper';
import { AuctionEndedEventDto } from '../dto/auction-ended-event.dto';

@WebSocketGateway({
  namespace: '/auctions',
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class AuctionBiddingGateway implements OnGatewayDisconnect {
  constructor(
    private readonly socketAuthenticationService: SocketAuthenticationService,
    private readonly auctionParticipantsService: AuctionParticipantsService,
    private readonly activeArenaService: ActiveArenaService,
  ) {}
  private readonly logger = new Logger(AuctionBiddingGateway.name);
  private readonly socketMemberships = new Map<string, Map<string, string>>();
  private readonly participantConnections = new Map<string, Set<string>>();
  @WebSocketServer()
  private server: Server;

  @SubscribeMessage('auction:join')
  async joinAuctionRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AuctionRoomInput | undefined,
  ): Promise<AuctionRoomResponse> {
    const auctionId = this.requireAuctionId(payload);

    const currentUser =
      await this.socketAuthenticationService.authenticate(client);

    const participation = await this.auctionParticipantsService.join({
      auctionId,
      userId: currentUser.sub,
    });

    await client.join(this.createRoomName(auctionId));
    this.registerConnection(client.id, auctionId, currentUser.sub);

    this.broadcastParticipantCount(participation);

    return participation;
  }

  @SubscribeMessage('auction:leave')
  async leaveAuctionRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AuctionRoomInput | undefined,
  ): Promise<AuctionRoomResponse> {
    const auctionId = this.requireAuctionId(payload);
    const currentUser =
      await this.socketAuthenticationService.authenticate(client);

    const shouldMarkLeft = this.unregisterConnection(
      client.id,
      auctionId,
      currentUser.sub,
    );
    await client.leave(this.createRoomName(auctionId));
    const participation = shouldMarkLeft
      ? await this.auctionParticipantsService.leave({
          auctionId,
          userId: currentUser.sub,
        })
      : {
          auctionId,
          participantCount:
            await this.auctionParticipantsService.countJoined(auctionId),
        };

    this.broadcastParticipantCount(participation);

    return participation;
  }

  @SubscribeMessage('auction:state')
  async getActiveArenaState(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AuctionRoomInput | undefined,
  ): Promise<ActiveArenaStateDto> {
    const auctionId = this.requireAuctionId(payload);

    const currentUser =
      await this.socketAuthenticationService.authenticate(client);

    return this.activeArenaService.getState({
      auctionId,
      userRole: currentUser.role,
      userId: currentUser.sub,
    });
  }

  broadcastAcceptedBid(event: BidAcceptedEventDto): void {
    try {
      const auctionRoom = this.server.to(this.createRoomName(event.auctionId));

      auctionRoom.emit('auction:bid-accepted', event);

      const extensionEvent = mapAuctionExtendedEvent(event);

      if (extensionEvent) {
        auctionRoom.emit('auction:extended', extensionEvent);
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to broadcast bid events for auction ${event.auctionId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  broadcastAuctionStarted(event: AuctionStartedEventDto): void {
    try {
      this.server
        .to(this.createRoomName(event.auctionId))
        .emit('auction:started', event);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to broadcast auction start for ${event.auctionId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  broadcastAuctionEnded(event: AuctionEndedEventDto): void {
    try {
      this.server
        .to(this.createRoomName(event.auctionId))
        .emit('auction:ended', event);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to broadcast auction result for ${event.auctionId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const memberships = [
      ...(this.socketMemberships.get(client.id)?.entries() ?? []),
    ];

    for (const [auctionId, userId] of memberships) {
      const shouldMarkLeft = this.unregisterConnection(
        client.id,
        auctionId,
        userId,
      );

      if (!shouldMarkLeft) {
        continue;
      }

      try {
        const participation = await this.auctionParticipantsService.leave({
          auctionId,
          userId,
        });

        this.broadcastParticipantCount(participation);
      } catch (error: unknown) {
        this.logger.error(
          `Failed to leave auction ${auctionId} after socket disconnect`,
          error instanceof Error ? error.stack : undefined,
        );
      }
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
  private broadcastParticipantCount(participation: AuctionRoomResponse): void {
    this.server
      .to(this.createRoomName(participation.auctionId))
      .emit('auction:participant-count', participation);
  }

  private registerConnection(
    socketId: string,
    auctionId: string,
    userId: string,
  ): void {
    const memberships =
      this.socketMemberships.get(socketId) ?? new Map<string, string>();

    memberships.set(auctionId, userId);
    this.socketMemberships.set(socketId, memberships);

    const participantKey = this.createParticipantKey(auctionId, userId);
    const socketIds =
      this.participantConnections.get(participantKey) ?? new Set<string>();

    socketIds.add(socketId);
    this.participantConnections.set(participantKey, socketIds);
  }

  private unregisterConnection(
    socketId: string,
    auctionId: string,
    userId: string,
  ): boolean {
    const memberships = this.socketMemberships.get(socketId);
    if (memberships?.get(auctionId) !== userId) {
      return false;
    }

    memberships.delete(auctionId);

    if (memberships.size === 0) {
      this.socketMemberships.delete(socketId);
    }

    const participantKey = this.createParticipantKey(auctionId, userId);
    const socketIds = this.participantConnections.get(participantKey);

    socketIds?.delete(socketId);

    if (socketIds && socketIds.size > 0) {
      return false;
    }

    this.participantConnections.delete(participantKey);

    return true;
  }

  private createParticipantKey(auctionId: string, userId: string): string {
    return `${auctionId}:${userId}`;
  }
}
