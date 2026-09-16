import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { PrismaService } from '../../database/prisma.service';
import { AuctionStatus, ParticipantStatus } from '../../generated/prisma/enums';
import { AuctionParticipantsService } from './auction-participants.service';

// expect.objectContaining is typed as any, which the lint rules reject once it
// is nested inside an object literal rather than passed as a whole argument.
const containing = (shape: Record<string, unknown>): unknown =>
  expect.objectContaining(shape);

const NOW = new Date('2026-03-01T12:00:00.000Z');

const AUCTION_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';

describe('AuctionParticipantsService', () => {
  let participantsService: AuctionParticipantsService;

  const auctionFindFirstMock = jest.fn();
  const participantUpsertMock = jest.fn();
  const participantUpdateManyMock = jest.fn();
  const participantCountMock = jest.fn();

  const transactionMock = {
    auction: { findFirst: auctionFindFirstMock },
    auctionParticipant: {
      upsert: participantUpsertMock,
      updateMany: participantUpdateManyMock,
      count: participantCountMock,
    },
  };

  type RunTransaction = <T>(
    callback: (transaction: typeof transactionMock) => Promise<T>,
  ) => Promise<T>;

  const runTransactionMock = jest.fn() as jest.MockedFunction<RunTransaction>;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);

    auctionFindFirstMock.mockResolvedValue({ id: AUCTION_ID });
    participantUpsertMock.mockResolvedValue({});
    participantUpdateManyMock.mockResolvedValue({ count: 1 });
    participantCountMock.mockResolvedValue(4);
    runTransactionMock.mockImplementation((callback) =>
      callback(transactionMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionParticipantsService,
        {
          provide: PrismaService,
          useValue: {
            auctionParticipant: { count: participantCountMock },
            $transaction: runTransactionMock,
          },
        },
      ],
    }).compile();

    participantsService = module.get(AuctionParticipantsService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('join', () => {
    it('accepts a scheduled or active auction only', async () => {
      await participantsService.join({
        auctionId: AUCTION_ID,
        userId: USER_ID,
      });

      expect(auctionFindFirstMock).toHaveBeenCalledWith(
        containing({
          where: {
            id: AUCTION_ID,
            status: { in: [AuctionStatus.SCHEDULED, AuctionStatus.ACTIVE] },
            deletedAt: null,
          },
        }),
      );
    });

    it('refuses an auction that is not open for participation', async () => {
      auctionFindFirstMock.mockResolvedValue(null);

      await expect(
        participantsService.join({ auctionId: AUCTION_ID, userId: USER_ID }),
      ).rejects.toBeInstanceOf(WsException);

      expect(participantUpsertMock).not.toHaveBeenCalled();
    });

    it('upserts on the auction/user pair so a second tab does not double-count', async () => {
      const result = await participantsService.join({
        auctionId: AUCTION_ID,
        userId: USER_ID,
      });

      expect(participantUpsertMock).toHaveBeenCalledWith({
        where: {
          auctionId_userId: { auctionId: AUCTION_ID, userId: USER_ID },
        },
        create: {
          auctionId: AUCTION_ID,
          userId: USER_ID,
          status: ParticipantStatus.JOINED,
          joinedAt: NOW,
          lastSeenAt: NOW,
        },
        update: {
          status: ParticipantStatus.JOINED,
          joinedAt: NOW,
          lastSeenAt: NOW,
        },
      });
      expect(result).toEqual({
        auctionId: AUCTION_ID,
        participantCount: 4,
      });
    });

    it('counts only accounts still in the room', async () => {
      await participantsService.join({
        auctionId: AUCTION_ID,
        userId: USER_ID,
      });

      expect(participantCountMock).toHaveBeenCalledWith({
        where: { auctionId: AUCTION_ID, status: ParticipantStatus.JOINED },
      });
    });
  });

  describe('leave', () => {
    it('marks the participant as left and returns the fresh count', async () => {
      participantCountMock.mockResolvedValue(3);

      const result = await participantsService.leave({
        auctionId: AUCTION_ID,
        userId: USER_ID,
      });

      expect(participantUpdateManyMock).toHaveBeenCalledWith({
        where: {
          auctionId: AUCTION_ID,
          userId: USER_ID,
          status: ParticipantStatus.JOINED,
        },
        data: { status: ParticipantStatus.LEFT, lastSeenAt: NOW },
      });
      expect(result.participantCount).toBe(3);
    });

    it('succeeds when the account was never in the room', async () => {
      participantUpdateManyMock.mockResolvedValue({ count: 0 });
      participantCountMock.mockResolvedValue(4);

      const result = await participantsService.leave({
        auctionId: AUCTION_ID,
        userId: USER_ID,
      });

      expect(result.participantCount).toBe(4);
    });
  });

  describe('countJoined', () => {
    it('counts the joined participants of one auction', async () => {
      participantCountMock.mockResolvedValue(7);

      await expect(participantsService.countJoined(AUCTION_ID)).resolves.toBe(
        7,
      );

      expect(participantCountMock).toHaveBeenCalledWith({
        where: { auctionId: AUCTION_ID, status: ParticipantStatus.JOINED },
      });
    });
  });
});
