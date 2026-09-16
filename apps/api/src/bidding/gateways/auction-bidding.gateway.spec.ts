import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { SocketAuthenticationService } from '../../auth/services/socket-authentication.service';
import { UserRole } from '../../generated/prisma/enums';
import { BidAcceptedEventDto } from '../dto/bid-accepted-event.dto';
import { ActiveArenaService } from '../services/active-arena.service';
import { AuctionParticipantsService } from '../services/auction-participants.service';
import { AuctionBiddingGateway } from './auction-bidding.gateway';

// expect.objectContaining is typed as any, which the lint rules reject once it
// is nested inside an object literal rather than passed as a whole argument.
const containing = (shape: Record<string, unknown>): unknown =>
  expect.objectContaining(shape);

const AUCTION_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const ROOM = `auction:${AUCTION_ID}`;

const PLACED_AT = new Date('2026-03-01T12:00:00.000Z');
const PREVIOUS_END_AT = new Date('2026-03-01T12:01:00.000Z');
const NEW_END_AT = new Date('2026-03-01T12:03:00.000Z');

describe('AuctionBiddingGateway', () => {
  let gateway: AuctionBiddingGateway;

  const authenticateMock = jest.fn();
  const joinParticipantMock = jest.fn();
  const leaveParticipantMock = jest.fn();
  const countJoinedMock = jest.fn();
  const getArenaStateMock = jest.fn();

  const emitMock = jest.fn() as jest.MockedFunction<
    (event: string, payload: unknown) => boolean
  >;
  const toMock = jest.fn(() => ({ emit: emitMock }));

  type TestClient = {
    socket: Socket;
    join: jest.Mock;
    leave: jest.Mock;
  };

  const createClient = (socketId: string): TestClient => {
    const join = jest.fn().mockResolvedValue(undefined);
    const leave = jest.fn().mockResolvedValue(undefined);

    return {
      socket: { id: socketId, join, leave } as unknown as Socket,
      join,
      leave,
    };
  };

  const emittedEvents = (): string[] =>
    emitMock.mock.calls.map(([event]) => event);

  const bidAcceptedEvent = (
    extension: BidAcceptedEventDto['extension'] = null,
  ): BidAcceptedEventDto => ({
    auctionId: AUCTION_ID,
    amount: '750.00',
    sequenceNo: 3,
    placedAt: PLACED_AT,
    currentPrice: '750.00',
    bidCount: 3,
    reserveMet: true,
    currentEndAt: NEW_END_AT,
    extension,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    authenticateMock.mockResolvedValue({ sub: USER_ID, role: UserRole.USER });
    joinParticipantMock.mockResolvedValue({
      auctionId: AUCTION_ID,
      participantCount: 5,
    });
    leaveParticipantMock.mockResolvedValue({
      auctionId: AUCTION_ID,
      participantCount: 4,
    });
    countJoinedMock.mockResolvedValue(5);
    getArenaStateMock.mockResolvedValue({ auctionId: AUCTION_ID });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionBiddingGateway,
        {
          provide: SocketAuthenticationService,
          useValue: { authenticate: authenticateMock },
        },
        {
          provide: AuctionParticipantsService,
          useValue: {
            join: joinParticipantMock,
            leave: leaveParticipantMock,
            countJoined: countJoinedMock,
          },
        },
        {
          provide: ActiveArenaService,
          useValue: { getState: getArenaStateMock },
        },
      ],
    }).compile();

    gateway = module.get(AuctionBiddingGateway);

    // @WebSocketServer only assigns the server once Nest binds the adapter.
    (gateway as unknown as { server: Server }).server = {
      to: toMock,
    } as unknown as Server;
  });

  describe('payload validation', () => {
    it.each([
      ['a missing payload', undefined],
      ['a missing auction ID', {} as { auctionId: string }],
      ['a non-UUID auction ID', { auctionId: 'not-a-uuid' }],
    ])('refuses %s before authenticating', async (_label, payload) => {
      await expect(
        gateway.joinAuctionRoom(createClient('socket-1').socket, payload),
      ).rejects.toBeInstanceOf(WsException);

      expect(authenticateMock).not.toHaveBeenCalled();
      expect(joinParticipantMock).not.toHaveBeenCalled();
    });
  });

  describe('auction:join', () => {
    it('joins the room and broadcasts the new participant count', async () => {
      const client = createClient('socket-1');

      const result = await gateway.joinAuctionRoom(client.socket, {
        auctionId: AUCTION_ID,
      });

      expect(joinParticipantMock).toHaveBeenCalledWith({
        auctionId: AUCTION_ID,
        userId: USER_ID,
      });
      expect(client.join).toHaveBeenCalledWith(ROOM);
      expect(toMock).toHaveBeenCalledWith(ROOM);
      expect(emitMock).toHaveBeenCalledWith('auction:participant-count', {
        auctionId: AUCTION_ID,
        participantCount: 5,
      });
      expect(result).toEqual({ auctionId: AUCTION_ID, participantCount: 5 });
    });
  });

  describe('auction:leave', () => {
    it('marks the account as left once its only tab leaves', async () => {
      const client = createClient('socket-1');

      await gateway.joinAuctionRoom(client.socket, { auctionId: AUCTION_ID });
      await gateway.leaveAuctionRoom(client.socket, { auctionId: AUCTION_ID });

      expect(leaveParticipantMock).toHaveBeenCalledWith({
        auctionId: AUCTION_ID,
        userId: USER_ID,
      });
      expect(client.leave).toHaveBeenCalledWith(ROOM);
    });

    it('keeps the account joined while another tab is still open', async () => {
      const firstTab = createClient('socket-1');
      const secondTab = createClient('socket-2');

      await gateway.joinAuctionRoom(firstTab.socket, { auctionId: AUCTION_ID });
      await gateway.joinAuctionRoom(secondTab.socket, {
        auctionId: AUCTION_ID,
      });

      await gateway.leaveAuctionRoom(firstTab.socket, {
        auctionId: AUCTION_ID,
      });

      // The second tab still holds the membership, so no LEFT row is written.
      expect(leaveParticipantMock).not.toHaveBeenCalled();
      expect(countJoinedMock).toHaveBeenCalledWith(AUCTION_ID);
    });

    it('marks the account as left once the last tab closes', async () => {
      const firstTab = createClient('socket-1');
      const secondTab = createClient('socket-2');

      await gateway.joinAuctionRoom(firstTab.socket, { auctionId: AUCTION_ID });
      await gateway.joinAuctionRoom(secondTab.socket, {
        auctionId: AUCTION_ID,
      });

      await gateway.leaveAuctionRoom(firstTab.socket, {
        auctionId: AUCTION_ID,
      });
      await gateway.leaveAuctionRoom(secondTab.socket, {
        auctionId: AUCTION_ID,
      });

      expect(leaveParticipantMock).toHaveBeenCalledTimes(1);
    });

    it('reports the current count when the socket never joined', async () => {
      const result = await gateway.leaveAuctionRoom(
        createClient('socket-9').socket,
        {
          auctionId: AUCTION_ID,
        },
      );

      expect(leaveParticipantMock).not.toHaveBeenCalled();
      expect(result).toEqual({ auctionId: AUCTION_ID, participantCount: 5 });
    });
  });

  describe('auction:state', () => {
    it('passes the authenticated identity and role to the arena', async () => {
      authenticateMock.mockResolvedValue({
        sub: USER_ID,
        role: UserRole.ADMIN,
      });

      await gateway.getActiveArenaState(createClient('socket-1').socket, {
        auctionId: AUCTION_ID,
      });

      expect(getArenaStateMock).toHaveBeenCalledWith({
        auctionId: AUCTION_ID,
        userId: USER_ID,
        userRole: UserRole.ADMIN,
      });
    });
  });

  describe('handleDisconnect', () => {
    it('releases the membership of a dropped socket', async () => {
      const client = createClient('socket-1');

      await gateway.joinAuctionRoom(client.socket, { auctionId: AUCTION_ID });
      await gateway.handleDisconnect(client.socket);

      expect(leaveParticipantMock).toHaveBeenCalledWith({
        auctionId: AUCTION_ID,
        userId: USER_ID,
      });
      expect(emitMock).toHaveBeenCalledWith('auction:participant-count', {
        auctionId: AUCTION_ID,
        participantCount: 4,
      });
    });

    it('keeps the account joined when another tab survives the drop', async () => {
      const firstTab = createClient('socket-1');
      const secondTab = createClient('socket-2');

      await gateway.joinAuctionRoom(firstTab.socket, { auctionId: AUCTION_ID });
      await gateway.joinAuctionRoom(secondTab.socket, {
        auctionId: AUCTION_ID,
      });

      await gateway.handleDisconnect(firstTab.socket);

      expect(leaveParticipantMock).not.toHaveBeenCalled();
    });

    it('does nothing for a socket that never joined a room', async () => {
      await gateway.handleDisconnect(createClient('socket-9').socket);

      expect(leaveParticipantMock).not.toHaveBeenCalled();
    });

    it('swallows a failure while leaving after a disconnect', async () => {
      const client = createClient('socket-1');
      await gateway.joinAuctionRoom(client.socket, { auctionId: AUCTION_ID });

      leaveParticipantMock.mockRejectedValue(new Error('database unavailable'));

      await expect(
        gateway.handleDisconnect(client.socket),
      ).resolves.toBeUndefined();
    });
  });

  describe('broadcastAcceptedBid', () => {
    it('emits the accepted bid without an extension event', () => {
      gateway.broadcastAcceptedBid(bidAcceptedEvent());

      expect(toMock).toHaveBeenCalledWith(ROOM);
      expect(emittedEvents()).toEqual(['auction:bid-accepted']);
    });

    it('emits a sudden-death extension alongside the accepted bid', () => {
      gateway.broadcastAcceptedBid(
        bidAcceptedEvent({
          extensionNumber: 2,
          previousEndAt: PREVIOUS_END_AT,
          newEndAt: NEW_END_AT,
        }),
      );

      expect(emittedEvents()).toEqual([
        'auction:bid-accepted',
        'auction:extended',
      ]);
      expect(emitMock).toHaveBeenLastCalledWith(
        'auction:extended',
        containing({
          auctionId: AUCTION_ID,
          extensionNumber: 2,
          extensionSeconds: 120,
          previousEndAt: PREVIOUS_END_AT,
          newEndAt: NEW_END_AT,
          triggeringBid: {
            amount: '750.00',
            sequenceNo: 3,
            placedAt: PLACED_AT,
          },
        }),
      );
    });

    it('logs instead of throwing when the broadcast fails', () => {
      toMock.mockImplementationOnce(() => {
        throw new Error('adapter unavailable');
      });

      expect(() =>
        gateway.broadcastAcceptedBid(bidAcceptedEvent()),
      ).not.toThrow();
    });
  });

  describe('lifecycle broadcasts', () => {
    it('emits the auction start to its room', () => {
      gateway.broadcastAuctionStarted({
        auctionId: AUCTION_ID,
        currentEndAt: NEW_END_AT,
      } as Parameters<AuctionBiddingGateway['broadcastAuctionStarted']>[0]);

      expect(toMock).toHaveBeenCalledWith(ROOM);
      expect(emittedEvents()).toEqual(['auction:started']);
    });

    it('emits the auction result to its room', () => {
      gateway.broadcastAuctionEnded({
        auctionId: AUCTION_ID,
      } as Parameters<AuctionBiddingGateway['broadcastAuctionEnded']>[0]);

      expect(emittedEvents()).toEqual(['auction:ended']);
    });

    it('logs instead of throwing when a lifecycle broadcast fails', () => {
      toMock.mockImplementationOnce(() => {
        throw new Error('adapter unavailable');
      });

      expect(() =>
        gateway.broadcastAuctionEnded({
          auctionId: AUCTION_ID,
        } as Parameters<AuctionBiddingGateway['broadcastAuctionEnded']>[0]),
      ).not.toThrow();
    });
  });
});
