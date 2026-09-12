import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { CloudinaryService } from '../infrastructure/cloudinary/cloudinary.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AuctionEventType,
  AuctionStatus,
  ParticipantStatus,
  Prisma,
} from '../generated/prisma/client';
import { AuctionCatalogService } from './services/auction-catalog.service';
import { AuctionDraftService } from './services/auction-draft.service';
import { AuctionImageStorageService } from './services/auction-image-storage.service';
import { AuctionPublishingService } from './services/auction-publishing.service';
import { OwnedAuctionService } from './services/owned-auction.service';

const NOW = new Date('2026-03-01T12:00:00.000Z');
const ONE_HOUR_MS = 60 * 60 * 1000;

const AUCTION_ID = '11111111-1111-4111-8111-111111111111';
const SELLER_ID = '22222222-2222-4222-8222-222222222222';
const CATEGORY_ID = '33333333-3333-4333-8333-333333333333';
const IMAGE_ID = '44444444-4444-4444-8444-444444444444';
const WATCHER_ID = '55555555-5555-4555-8555-555555555555';
const PARTICIPANT_ID = '66666666-6666-4666-8666-666666666666';

// The auction services share one Prisma double, so they are built together
// from a single testing module rather than repeating the setup per service.
describe('auction services', () => {
  let auctionCatalogService: AuctionCatalogService;
  let auctionDraftService: AuctionDraftService;
  let auctionPublishingService: AuctionPublishingService;
  let ownedAuctionService: OwnedAuctionService;

  const auctionFindManyMock = jest.fn();
  const auctionFindFirstMock = jest.fn();

  const transactionAuctionFindFirstMock = jest.fn();
  const transactionAuctionFindUniqueMock = jest.fn();
  const transactionAuctionFindUniqueOrThrowMock = jest.fn();
  const transactionAuctionUpdateManyMock = jest.fn();
  const transactionAuctionCreateMock = jest.fn();
  const transactionAuctionEventCreateMock = jest.fn();
  const transactionCategoryFindUniqueMock = jest.fn();
  const transactionWatchlistFindManyMock = jest.fn();
  const transactionParticipantFindManyMock = jest.fn();

  const transactionMock = {
    auction: {
      findFirst: transactionAuctionFindFirstMock,
      findUnique: transactionAuctionFindUniqueMock,
      findUniqueOrThrow: transactionAuctionFindUniqueOrThrowMock,
      updateMany: transactionAuctionUpdateManyMock,
      create: transactionAuctionCreateMock,
    },
    auctionEvent: {
      create: transactionAuctionEventCreateMock,
    },
    category: {
      findUnique: transactionCategoryFindUniqueMock,
    },
    watchlist: {
      findMany: transactionWatchlistFindManyMock,
    },
    auctionParticipant: {
      findMany: transactionParticipantFindManyMock,
    },
  };

  type RunTransaction = (
    callback: (transaction: typeof transactionMock) => Promise<unknown>,
  ) => Promise<unknown>;

  const runTransactionMock = jest.fn() as jest.MockedFunction<RunTransaction>;

  const createCancellationNotificationsMock = jest.fn();

  const decimal = (value: string): Prisma.Decimal => new Prisma.Decimal(value);

  const publishableDraft = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: AUCTION_ID,
    sellerId: SELLER_ID,
    title: 'Vintage diving watch',
    description: 'A well kept automatic diver.',
    status: AuctionStatus.DRAFT,
    startingPrice: decimal('100.00'),
    reservePrice: decimal('500.00'),
    minBidIncrement: decimal('10.00'),
    scheduledStartAt: new Date(NOW.getTime() + ONE_HOUR_MS),
    currentEndAt: new Date(NOW.getTime() + 2 * ONE_HOUR_MS),
    rowVersion: 3,
    category: { isActive: true },
    _count: { auctionImages: 1 },
    auctionImages: [{ id: IMAGE_ID }],
    ...overrides,
  });

  const publishedRecord = (status: AuctionStatus, startedAt: Date | null) => ({
    id: AUCTION_ID,
    status,
    scheduledStartAt: new Date(NOW.getTime() + ONE_HOUR_MS),
    currentEndAt: new Date(NOW.getTime() + 2 * ONE_HOUR_MS),
    publishedAt: NOW,
    startedAt,
    rowVersion: 4,
  });

  const cancellableAuction = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: AUCTION_ID,
    sellerId: SELLER_ID,
    title: 'Vintage diving watch',
    status: AuctionStatus.SCHEDULED,
    cancellationReason: null,
    endedAt: null,
    rowVersion: 3,
    _count: { bids: 0 },
    ...overrides,
  });

  const draftRecord = () => ({
    id: AUCTION_ID,
    sellerId: SELLER_ID,
    categoryId: CATEGORY_ID,
    title: 'Vintage diving watch',
    description: 'A well kept automatic diver.',
    status: AuctionStatus.DRAFT,
    currency: 'THB',
    startingPrice: decimal('100.00'),
    reservePrice: decimal('500.00'),
    minBidIncrement: decimal('10.00'),
    currentPrice: decimal('100.00'),
    scheduledStartAt: null,
    originalEndAt: null,
    currentEndAt: null,
    rowVersion: 1,
    createdAt: NOW,
    updatedAt: NOW,
    category: { id: CATEGORY_ID, name: 'Watches', slug: 'watches' },
    auctionImages: [],
  });

  const createDraftInput = {
    sellerId: SELLER_ID,
    categoryId: CATEGORY_ID,
    title: 'Vintage diving watch',
    description: 'A well kept automatic diver.',
    startingPrice: '100.00',
    minBidIncrement: '10.00',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);

    runTransactionMock.mockImplementation((callback) =>
      callback(transactionMock),
    );
    transactionAuctionUpdateManyMock.mockResolvedValue({ count: 1 });
    transactionAuctionEventCreateMock.mockResolvedValue({});
    transactionWatchlistFindManyMock.mockResolvedValue([]);
    transactionParticipantFindManyMock.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionCatalogService,
        AuctionDraftService,
        AuctionImageStorageService,
        AuctionPublishingService,
        OwnedAuctionService,
        {
          provide: PrismaService,
          useValue: {
            auction: {
              findMany: auctionFindManyMock,
              findFirst: auctionFindFirstMock,
            },
            $transaction: runTransactionMock,
          },
        },
        {
          provide: CloudinaryService,
          useValue: {
            uploadAuctionImage: jest.fn(),
            deleteAuctionImage: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createAuctionCancellationNotifications:
              createCancellationNotificationsMock,
          },
        },
      ],
    }).compile();

    auctionCatalogService = module.get<AuctionCatalogService>(
      AuctionCatalogService,
    );
    auctionDraftService = module.get<AuctionDraftService>(AuctionDraftService);
    auctionPublishingService = module.get<AuctionPublishingService>(
      AuctionPublishingService,
    );
    ownedAuctionService = module.get<OwnedAuctionService>(OwnedAuctionService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('publish', () => {
    const publishInput = { auctionId: AUCTION_ID, sellerId: SELLER_ID };

    const arrangePublish = (
      overrides: Record<string, unknown> = {},
      status: AuctionStatus = AuctionStatus.SCHEDULED,
      startedAt: Date | null = null,
    ): void => {
      transactionAuctionFindFirstMock.mockResolvedValue(
        publishableDraft(overrides),
      );
      transactionAuctionFindUniqueMock.mockResolvedValue(
        publishedRecord(status, startedAt),
      );
    };

    it('schedules an auction whose start time is still ahead', async () => {
      arrangePublish();

      const response = await auctionPublishingService.publish(publishInput);

      expect(transactionAuctionUpdateManyMock).toHaveBeenCalledWith({
        where: {
          id: AUCTION_ID,
          sellerId: SELLER_ID,
          status: AuctionStatus.DRAFT,
          deletedAt: null,
          rowVersion: 3,
        },
        data: {
          status: AuctionStatus.SCHEDULED,
          publishedAt: NOW,
          startedAt: null,
          rowVersion: { increment: 1 },
        },
      });

      expect(response.status).toBe(AuctionStatus.SCHEDULED);
    });

    it('activates an auction whose start time has already arrived', async () => {
      arrangePublish({ scheduledStartAt: NOW }, AuctionStatus.ACTIVE, NOW);

      await auctionPublishingService.publish(publishInput);

      expect(transactionAuctionUpdateManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: AuctionStatus.ACTIVE,
            publishedAt: NOW,
            startedAt: NOW,
            rowVersion: { increment: 1 },
          },
        }) as unknown,
      );
    });

    it('records a PUBLISHED event only when the auction is merely scheduled', async () => {
      arrangePublish();

      await auctionPublishingService.publish(publishInput);

      expect(transactionAuctionEventCreateMock).toHaveBeenCalledTimes(1);
      expect(transactionAuctionEventCreateMock).toHaveBeenCalledWith({
        data: {
          auctionId: AUCTION_ID,
          actorUserId: SELLER_ID,
          eventType: AuctionEventType.PUBLISHED,
        },
      });
    });

    it('also records a STARTED event when publication activates the auction', async () => {
      arrangePublish({ scheduledStartAt: NOW }, AuctionStatus.ACTIVE, NOW);

      await auctionPublishingService.publish(publishInput);

      expect(transactionAuctionEventCreateMock).toHaveBeenCalledTimes(2);
      expect(transactionAuctionEventCreateMock).toHaveBeenNthCalledWith(2, {
        data: {
          auctionId: AUCTION_ID,
          actorUserId: SELLER_ID,
          eventType: AuctionEventType.STARTED,
        },
      });
    });

    it('rejects publishing an auction the seller does not own', async () => {
      transactionAuctionFindFirstMock.mockResolvedValue(null);

      await expect(
        auctionPublishingService.publish(publishInput),
      ).rejects.toThrow(new NotFoundException('Auction draft not found'));
    });

    it('rejects publishing anything that is no longer a draft', async () => {
      arrangePublish({ status: AuctionStatus.SCHEDULED });

      await expect(
        auctionPublishingService.publish(publishInput),
      ).rejects.toThrow(
        new ConflictException('Only draft auctions can be published'),
      );
    });

    it.each([
      ['a blank title', { title: '   ' }],
      ['a blank description', { description: '   ' }],
    ])('refuses publication with %s', async (_case, overrides) => {
      arrangePublish(overrides);

      await expect(
        auctionPublishingService.publish(publishInput),
      ).rejects.toThrow(
        new BadRequestException(
          'Auction title and description are required before publication',
        ),
      );
    });

    it('refuses publication into a deactivated category', async () => {
      arrangePublish({ category: { isActive: false } });

      await expect(
        auctionPublishingService.publish(publishInput),
      ).rejects.toThrow(
        new BadRequestException('Auction category must be active'),
      );
    });

    it('refuses publication when the reserve price sits below the starting price', async () => {
      arrangePublish({ reservePrice: decimal('50.00') });

      await expect(
        auctionPublishingService.publish(publishInput),
      ).rejects.toThrow(
        new BadRequestException(
          'Reserve price cannot be lower than starting price',
        ),
      );
    });

    it('refuses publication without a schedule', async () => {
      arrangePublish({ scheduledStartAt: null });

      await expect(
        auctionPublishingService.publish(publishInput),
      ).rejects.toThrow(
        new BadRequestException(
          'Auction schedule is required before publication',
        ),
      );
    });

    it('refuses publication when the end time is not after the start time', async () => {
      const sameMoment = new Date(NOW.getTime() + ONE_HOUR_MS);

      arrangePublish({
        scheduledStartAt: sameMoment,
        currentEndAt: sameMoment,
      });

      await expect(
        auctionPublishingService.publish(publishInput),
      ).rejects.toThrow(
        new BadRequestException(
          'Auction end time must be later than start time',
        ),
      );
    });

    it('refuses publication of a schedule that already ended', async () => {
      arrangePublish({
        scheduledStartAt: new Date(NOW.getTime() - 2 * ONE_HOUR_MS),
        currentEndAt: new Date(NOW.getTime() - ONE_HOUR_MS),
      });

      await expect(
        auctionPublishingService.publish(publishInput),
      ).rejects.toThrow(
        new BadRequestException('Auction end time must be in the future'),
      );
    });

    it('refuses publication without any image', async () => {
      arrangePublish({ _count: { auctionImages: 0 }, auctionImages: [] });

      await expect(
        auctionPublishingService.publish(publishInput),
      ).rejects.toThrow(
        new BadRequestException(
          'At least one auction image is required before publication',
        ),
      );
    });

    it.each([
      ['none', []],
      ['two', [{ id: IMAGE_ID }, { id: 'another-image' }]],
    ])(
      'refuses publication when %s primary images are marked',
      async (_case, auctionImages) => {
        arrangePublish({ _count: { auctionImages: 2 }, auctionImages });

        await expect(
          auctionPublishingService.publish(publishInput),
        ).rejects.toThrow(
          new BadRequestException(
            'Auction must have exactly one primary image before publication',
          ),
        );
      },
    );

    it('rejects publication when the draft changed under the row version', async () => {
      arrangePublish();
      transactionAuctionUpdateManyMock.mockResolvedValue({ count: 0 });

      await expect(
        auctionPublishingService.publish(publishInput),
      ).rejects.toThrow(
        new ConflictException('Auction draft changed; reload and try again'),
      );

      expect(transactionAuctionEventCreateMock).not.toHaveBeenCalled();
    });
  });

  describe('cancelOwnedScheduled', () => {
    const cancelInput = {
      auctionId: AUCTION_ID,
      sellerId: SELLER_ID,
      reason: 'Item is no longer available',
    };

    it('cancels a scheduled auction and records who did it', async () => {
      transactionAuctionFindFirstMock.mockResolvedValue(cancellableAuction());
      transactionAuctionFindUniqueOrThrowMock.mockResolvedValue(
        cancellableAuction({
          status: AuctionStatus.CANCELLED,
          cancellationReason: cancelInput.reason,
          endedAt: NOW,
          rowVersion: 4,
        }),
      );

      const response =
        await ownedAuctionService.cancelOwnedScheduled(cancelInput);

      expect(transactionAuctionUpdateManyMock).toHaveBeenCalledWith({
        where: {
          id: AUCTION_ID,
          sellerId: SELLER_ID,
          status: AuctionStatus.SCHEDULED,
          rowVersion: 3,
          deletedAt: null,
        },
        data: {
          status: AuctionStatus.CANCELLED,
          cancellationReason: cancelInput.reason,
          endedAt: NOW,
          winnerUserId: null,
          winningBidId: null,
          soldPrice: null,
          rowVersion: { increment: 1 },
        },
      });

      expect(transactionAuctionEventCreateMock).toHaveBeenCalledWith({
        data: {
          auctionId: AUCTION_ID,
          actorUserId: SELLER_ID,
          eventType: AuctionEventType.CANCELLED,
        },
      });

      expect(response.status).toBe(AuctionStatus.CANCELLED);
    });

    it('returns the existing state when the auction was already cancelled', async () => {
      transactionAuctionFindFirstMock.mockResolvedValue(
        cancellableAuction({
          status: AuctionStatus.CANCELLED,
          cancellationReason: 'Cancelled earlier',
        }),
      );

      const response =
        await ownedAuctionService.cancelOwnedScheduled(cancelInput);

      expect(response.cancellationReason).toBe('Cancelled earlier');
      expect(transactionAuctionUpdateManyMock).not.toHaveBeenCalled();
      expect(transactionAuctionEventCreateMock).not.toHaveBeenCalled();
    });

    it('refuses to cancel an auction that is not scheduled', async () => {
      transactionAuctionFindFirstMock.mockResolvedValue(
        cancellableAuction({ status: AuctionStatus.ACTIVE }),
      );

      await expect(
        ownedAuctionService.cancelOwnedScheduled(cancelInput),
      ).rejects.toThrow(
        new ConflictException(
          'Only scheduled auctions can be cancelled by the seller',
        ),
      );
    });

    it('refuses to cancel once a bid has been accepted', async () => {
      transactionAuctionFindFirstMock.mockResolvedValue(
        cancellableAuction({ _count: { bids: 1 } }),
      );

      await expect(
        ownedAuctionService.cancelOwnedScheduled(cancelInput),
      ).rejects.toThrow(
        new ConflictException(
          'Auctions with accepted bids cannot be cancelled',
        ),
      );

      expect(transactionAuctionUpdateManyMock).not.toHaveBeenCalled();
    });

    it('rejects a cancellation that lost the row version race', async () => {
      transactionAuctionFindFirstMock.mockResolvedValue(cancellableAuction());
      transactionAuctionUpdateManyMock.mockResolvedValue({ count: 0 });

      await expect(
        ownedAuctionService.cancelOwnedScheduled(cancelInput),
      ).rejects.toThrow(
        new ConflictException('Auction changed; reload and try again'),
      );
    });

    it('notifies watchers and joined participants exactly once each, never the seller', async () => {
      transactionAuctionFindFirstMock.mockResolvedValue(cancellableAuction());
      transactionAuctionFindUniqueOrThrowMock.mockResolvedValue(
        cancellableAuction({ status: AuctionStatus.CANCELLED }),
      );
      transactionWatchlistFindManyMock.mockResolvedValue([
        { userId: WATCHER_ID },
        { userId: PARTICIPANT_ID },
        { userId: SELLER_ID },
      ]);
      transactionParticipantFindManyMock.mockResolvedValue([
        { userId: PARTICIPANT_ID },
      ]);

      await ownedAuctionService.cancelOwnedScheduled(cancelInput);

      expect(transactionParticipantFindManyMock).toHaveBeenCalledWith({
        where: {
          auctionId: AUCTION_ID,
          status: ParticipantStatus.JOINED,
        },
        select: { userId: true },
      });

      expect(createCancellationNotificationsMock).toHaveBeenCalledWith(
        transactionMock,
        {
          userIds: [WATCHER_ID, PARTICIPANT_ID],
          auctionId: AUCTION_ID,
          auctionTitle: 'Vintage diving watch',
          reason: cancelInput.reason,
        },
      );
    });

    it('refuses to cancel an auction the seller does not own', async () => {
      transactionAuctionFindFirstMock.mockResolvedValue(null);

      await expect(
        ownedAuctionService.cancelOwnedScheduled(cancelInput),
      ).rejects.toThrow(new NotFoundException('Auction not found'));
    });
  });

  describe('createDraft', () => {
    beforeEach(() => {
      transactionCategoryFindUniqueMock.mockResolvedValue({ isActive: true });
      transactionAuctionCreateMock.mockResolvedValue(draftRecord());
    });

    it('opens the auction at its starting price and records a CREATED event', async () => {
      const response = await auctionDraftService.createDraft(createDraftInput);

      expect(transactionAuctionCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            sellerId: SELLER_ID,
            categoryId: CATEGORY_ID,
            title: createDraftInput.title,
            description: createDraftInput.description,
            startingPrice: decimal('100.00'),
            reservePrice: null,
            minBidIncrement: decimal('10.00'),
            currentPrice: decimal('100.00'),
            scheduledStartAt: null,
            originalEndAt: null,
            currentEndAt: null,
          },
        }) as unknown,
      );

      expect(transactionAuctionEventCreateMock).toHaveBeenCalledWith({
        data: {
          auctionId: AUCTION_ID,
          actorUserId: SELLER_ID,
          eventType: AuctionEventType.CREATED,
        },
      });

      expect(response.currentPrice).toBe('100.00');
    });

    it('validates prices before opening a transaction', async () => {
      await expect(
        auctionDraftService.createDraft({
          ...createDraftInput,
          startingPrice: '0.00',
        }),
      ).rejects.toThrow(
        new BadRequestException('Auction prices must be greater than zero'),
      );

      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it('requires both schedule ends before opening a transaction', async () => {
      await expect(
        auctionDraftService.createDraft({
          ...createDraftInput,
          scheduledStartAt: new Date(NOW.getTime() + ONE_HOUR_MS),
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Scheduled start and end times must be supplied together',
        ),
      );

      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it('rejects an unknown category', async () => {
      transactionCategoryFindUniqueMock.mockResolvedValue(null);

      await expect(
        auctionDraftService.createDraft(createDraftInput),
      ).rejects.toThrow(new NotFoundException('Category not found'));

      expect(transactionAuctionCreateMock).not.toHaveBeenCalled();
    });

    it('rejects a deactivated category', async () => {
      transactionCategoryFindUniqueMock.mockResolvedValue({ isActive: false });

      await expect(
        auctionDraftService.createDraft(createDraftInput),
      ).rejects.toThrow(
        new BadRequestException('Auction category must be active'),
      );
    });
  });

  describe('updateOwnedDraft', () => {
    it('refuses an update that carries no field', async () => {
      await expect(
        auctionDraftService.updateOwnedDraft({
          auctionId: AUCTION_ID,
          sellerId: SELLER_ID,
        }),
      ).rejects.toThrow(
        new BadRequestException('At least one auction draft field is required'),
      );

      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it('refuses an update that moves only one end of the schedule', async () => {
      await expect(
        auctionDraftService.updateOwnedDraft({
          auctionId: AUCTION_ID,
          sellerId: SELLER_ID,
          scheduledEndAt: new Date(NOW.getTime() + ONE_HOUR_MS),
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Scheduled start and end times must be supplied together',
        ),
      );

      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it('refuses to touch an auction that is no longer a draft', async () => {
      transactionAuctionFindFirstMock.mockResolvedValue(null);

      await expect(
        auctionDraftService.updateOwnedDraft({
          auctionId: AUCTION_ID,
          sellerId: SELLER_ID,
          title: 'A new title',
        }),
      ).rejects.toThrow(new NotFoundException('Auction draft not found'));
    });
  });

  describe('public visibility', () => {
    it('hides auctions that are not fully published from the public detail route', async () => {
      auctionFindFirstMock.mockResolvedValue(null);

      await expect(
        auctionCatalogService.findPublicById(AUCTION_ID),
      ).rejects.toThrow(new NotFoundException('Auction not found'));

      expect(auctionFindFirstMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: AUCTION_ID,
            status: {
              in: [
                AuctionStatus.SCHEDULED,
                AuctionStatus.ACTIVE,
                AuctionStatus.SOLD,
                AuctionStatus.UNSOLD,
              ],
            },
            deletedAt: null,
            scheduledStartAt: { not: null },
            currentEndAt: { not: null },
            publishedAt: { not: null },
            auctionImages: { some: { isPrimary: true } },
          },
        }) as unknown,
      );
    });

    it('applies the same publication requirements to the public list', async () => {
      auctionFindManyMock.mockResolvedValue([]);

      await auctionCatalogService.listPublic({ limit: 20 });

      expect(auctionFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: {
              in: [
                AuctionStatus.SCHEDULED,
                AuctionStatus.ACTIVE,
                AuctionStatus.SOLD,
                AuctionStatus.UNSOLD,
              ],
            },
            deletedAt: null,
            scheduledStartAt: { not: null },
            currentEndAt: { not: null },
            publishedAt: { not: null },
            auctionImages: { some: { isPrimary: true } },
          },
          take: 21,
        }) as unknown,
      );
    });

    it('ranks hot auctions by accepted bids and excludes the ones already over', async () => {
      auctionFindManyMock.mockResolvedValue([]);

      await auctionCatalogService.listHot({ limit: 8 });

      expect(auctionFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: AuctionStatus.ACTIVE,
            currentEndAt: { gt: NOW },
          }) as unknown,
          orderBy: [
            { bidCount: 'desc' },
            { currentEndAt: 'asc' },
            { id: 'asc' },
          ],
          take: 8,
        }) as unknown,
      );
    });

    it('pages owned auctions from the cursor without repeating it', async () => {
      auctionFindManyMock.mockResolvedValue([]);

      await ownedAuctionService.listOwned({
        sellerId: SELLER_ID,
        limit: 20,
        cursor: AUCTION_ID,
      });

      expect(auctionFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sellerId: SELLER_ID, deletedAt: null },
          cursor: { id: AUCTION_ID },
          skip: 1,
          take: 21,
        }) as unknown,
      );
    });
  });
});
