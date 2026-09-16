import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { NotificationType, Prisma } from '../generated/prisma/client';
import { NotificationsService } from './notifications.service';

// expect.objectContaining is typed as any, which the lint rules reject once it
// is nested inside an object literal rather than passed as a whole argument.
const containing = (shape: Record<string, unknown>): unknown =>
  expect.objectContaining(shape);

const NOW = new Date('2026-03-01T12:00:00.000Z');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SELLER_ID = '22222222-2222-4222-8222-222222222222';
const WINNER_ID = '33333333-3333-4333-8333-333333333333';
const AUCTION_ID = '44444444-4444-4444-8444-444444444444';
const BID_ID = '55555555-5555-4555-8555-555555555555';
const NOTIFICATION_ID = '66666666-6666-4666-8666-666666666666';
const OLDER_NOTIFICATION_ID = '77777777-7777-4777-8777-777777777777';
const WATCHER_ID = '88888888-8888-4888-8888-888888888888';

type NotificationRow = {
  id: string;
  auctionId: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
};

describe('NotificationsService', () => {
  let notificationsService: NotificationsService;

  const notificationFindManyMock = jest.fn();
  const notificationFindFirstMock = jest.fn();
  const notificationUpdateManyMock = jest.fn();
  const notificationCreateMock = jest.fn();
  const notificationCreateManyMock = jest.fn();

  const transactionMock = {
    notification: {
      findFirst: notificationFindFirstMock,
      updateMany: notificationUpdateManyMock,
      create: notificationCreateMock,
      createMany: notificationCreateManyMock,
    },
  };

  type RunTransaction = <T>(
    callback: (transaction: typeof transactionMock) => Promise<T>,
  ) => Promise<T>;

  const runTransactionMock = jest.fn() as jest.MockedFunction<RunTransaction>;

  const createNotification = (
    overrides: Partial<NotificationRow> = {},
  ): NotificationRow => ({
    id: NOTIFICATION_ID,
    auctionId: AUCTION_ID,
    type: NotificationType.OUTBID,
    title: 'You have been outbid',
    message: 'A higher bid was placed on "Vintage diving watch".',
    readAt: null,
    createdAt: NOW,
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);

    notificationFindManyMock.mockResolvedValue([]);
    notificationFindFirstMock.mockResolvedValue(createNotification());
    notificationUpdateManyMock.mockResolvedValue({ count: 1 });
    notificationCreateMock.mockResolvedValue({});
    notificationCreateManyMock.mockResolvedValue({ count: 1 });
    runTransactionMock.mockImplementation((callback) =>
      callback(transactionMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: {
            notification: {
              findMany: notificationFindManyMock,
              findFirst: notificationFindFirstMock,
            },
            $transaction: runTransactionMock,
          },
        },
      ],
    }).compile();

    notificationsService = module.get(NotificationsService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('listNotifications', () => {
    it('returns only the caller notifications', async () => {
      notificationFindManyMock.mockResolvedValue([createNotification()]);

      const result = await notificationsService.listNotifications({
        userId: USER_ID,
        limit: 20,
        unreadOnly: false,
      });

      expect(result.items).toEqual([createNotification()]);
      expect(notificationFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID } }),
      );
    });

    it('filters to unread notifications when asked', async () => {
      await notificationsService.listNotifications({
        userId: USER_ID,
        limit: 20,
        unreadOnly: true,
      });

      expect(notificationFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID, readAt: null } }),
      );
    });

    it('rejects a cursor that does not belong to the caller', async () => {
      notificationFindFirstMock.mockResolvedValue(null);

      await expect(
        notificationsService.listNotifications({
          userId: USER_ID,
          cursor: NOTIFICATION_ID,
          limit: 20,
          unreadOnly: false,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      // The cursor check is scoped by userId, so another account cannot page
      // through someone else's notifications.
      expect(notificationFindFirstMock).toHaveBeenCalledWith({
        where: { id: NOTIFICATION_ID, userId: USER_ID },
        select: { id: true },
      });
      expect(notificationFindManyMock).not.toHaveBeenCalled();
    });

    it('skips the cursor entry when continuing a page', async () => {
      await notificationsService.listNotifications({
        userId: USER_ID,
        cursor: NOTIFICATION_ID,
        limit: 20,
        unreadOnly: false,
      });

      expect(notificationFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: { id: NOTIFICATION_ID }, skip: 1 }),
      );
    });

    it('returns the next cursor when more notifications remain', async () => {
      notificationFindManyMock.mockResolvedValue([
        createNotification(),
        createNotification({ id: OLDER_NOTIFICATION_ID }),
      ]);

      const result = await notificationsService.listNotifications({
        userId: USER_ID,
        limit: 1,
        unreadOnly: false,
      });

      expect(notificationFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({ take: 2 }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBe(NOTIFICATION_ID);
    });

    it('returns a null cursor on the final page', async () => {
      notificationFindManyMock.mockResolvedValue([createNotification()]);

      const result = await notificationsService.listNotifications({
        userId: USER_ID,
        limit: 20,
        unreadOnly: false,
      });

      expect(result.nextCursor).toBeNull();
    });
  });

  describe('markNotificationAsRead', () => {
    it('stamps readAt only while the notification is still unread', async () => {
      notificationFindFirstMock.mockResolvedValue(
        createNotification({ readAt: NOW }),
      );

      const result = await notificationsService.markNotificationAsRead({
        notificationId: NOTIFICATION_ID,
        userId: USER_ID,
      });

      expect(notificationUpdateManyMock).toHaveBeenCalledWith({
        where: { id: NOTIFICATION_ID, userId: USER_ID, readAt: null },
        data: { readAt: NOW },
      });
      expect(result.readAt).toEqual(NOW);
    });

    it('keeps the original readAt when marking an already-read notification', async () => {
      const firstReadAt = new Date('2026-02-28T08:00:00.000Z');

      notificationUpdateManyMock.mockResolvedValue({ count: 0 });
      notificationFindFirstMock.mockResolvedValue(
        createNotification({ readAt: firstReadAt }),
      );

      const result = await notificationsService.markNotificationAsRead({
        notificationId: NOTIFICATION_ID,
        userId: USER_ID,
      });

      expect(result.readAt).toEqual(firstReadAt);
    });

    it('rejects a notification belonging to another account', async () => {
      notificationFindFirstMock.mockResolvedValue(null);

      await expect(
        notificationsService.markNotificationAsRead({
          notificationId: NOTIFICATION_ID,
          userId: USER_ID,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createOutbidNotification', () => {
    it('records an outbid alert linked to the auction and winning bid', async () => {
      await notificationsService.createOutbidNotification(
        transactionMock as unknown as Prisma.TransactionClient,
        {
          userId: USER_ID,
          auctionId: AUCTION_ID,
          bidId: BID_ID,
          auctionTitle: 'Vintage diving watch',
          currentPrice: '750.00',
          currency: 'THB',
        },
      );

      expect(notificationCreateMock).toHaveBeenCalledWith({
        data: containing({
          userId: USER_ID,
          auctionId: AUCTION_ID,
          bidId: BID_ID,
          type: NotificationType.OUTBID,
          title: 'You have been outbid',
          message:
            'A higher bid was placed on "Vintage diving watch". The current price is 750.00 THB.',
        }),
      });
    });
  });

  describe('createAuctionResultNotifications', () => {
    it('notifies both the seller and the winner for a sold auction', async () => {
      await notificationsService.createAuctionResultNotifications(
        transactionMock as unknown as Prisma.TransactionClient,
        {
          auctionId: AUCTION_ID,
          auctionTitle: 'Vintage diving watch',
          sellerId: SELLER_ID,
          currency: 'THB',
          result: {
            sold: true,
            winnerUserId: WINNER_ID,
            winningBidId: BID_ID,
            soldPrice: '750.00',
          },
        },
      );

      expect(notificationCreateMock).toHaveBeenCalledTimes(2);

      expect(notificationCreateMock).toHaveBeenNthCalledWith(1, {
        data: containing({
          userId: SELLER_ID,
          bidId: BID_ID,
          type: NotificationType.AUCTION_ENDED,
          message: '"Vintage diving watch" sold for 750.00 THB.',
        }),
      });

      expect(notificationCreateMock).toHaveBeenNthCalledWith(2, {
        data: containing({
          userId: WINNER_ID,
          bidId: BID_ID,
          type: NotificationType.AUCTION_WON,
          title: 'You won the auction',
        }),
      });
    });

    it('notifies only the seller for an unsold auction', async () => {
      await notificationsService.createAuctionResultNotifications(
        transactionMock as unknown as Prisma.TransactionClient,
        {
          auctionId: AUCTION_ID,
          auctionTitle: 'Vintage diving watch',
          sellerId: SELLER_ID,
          currency: 'THB',
          result: { sold: false, highestBidId: BID_ID },
        },
      );

      expect(notificationCreateMock).toHaveBeenCalledTimes(1);
      expect(notificationCreateMock).toHaveBeenCalledWith({
        data: containing({
          userId: SELLER_ID,
          bidId: BID_ID,
          type: NotificationType.AUCTION_ENDED,
          message: '"Vintage diving watch" ended without a successful sale.',
        }),
      });
    });

    it('links no bid when an unsold auction never received one', async () => {
      await notificationsService.createAuctionResultNotifications(
        transactionMock as unknown as Prisma.TransactionClient,
        {
          auctionId: AUCTION_ID,
          auctionTitle: 'Vintage diving watch',
          sellerId: SELLER_ID,
          currency: 'THB',
          result: { sold: false, highestBidId: null },
        },
      );

      expect(notificationCreateMock).toHaveBeenCalledWith({
        data: containing({ bidId: null }),
      });
    });
  });

  describe('createAuctionCancellationNotifications', () => {
    it('writes one cancellation notice per affected account', async () => {
      await notificationsService.createAuctionCancellationNotifications(
        transactionMock as unknown as Prisma.TransactionClient,
        {
          userIds: [USER_ID, WATCHER_ID],
          auctionId: AUCTION_ID,
          auctionTitle: 'Vintage diving watch',
          reason: 'Prohibited item',
        },
      );

      expect(notificationCreateManyMock).toHaveBeenCalledWith({
        data: [
          containing({
            userId: USER_ID,
            auctionId: AUCTION_ID,
            bidId: null,
            type: NotificationType.AUCTION_CANCELLED,
            message:
              'Auction "Vintage diving watch" was cancelled. Reason: Prohibited item',
          }),
          containing({ userId: WATCHER_ID }),
        ],
      });
    });

    it('writes nothing when nobody is affected', async () => {
      await notificationsService.createAuctionCancellationNotifications(
        transactionMock as unknown as Prisma.TransactionClient,
        {
          userIds: [],
          auctionId: AUCTION_ID,
          auctionTitle: 'Vintage diving watch',
          reason: 'Prohibited item',
        },
      );

      expect(notificationCreateManyMock).not.toHaveBeenCalled();
    });
  });
});
