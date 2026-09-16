import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuctionLifecycleService } from '../src/auctions/services/auction-lifecycle.service';
import { PrismaService } from '../src/database/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { AuctionEventType, AuctionStatus } from '../src/generated/prisma/enums';
import { createE2eApp } from './utils/create-e2e-app';

// These tests cover the behaviour that mocked unit tests cannot prove: the
// unique client_request_id constraint, Serializable isolation under two
// simultaneous bids, the anti-sniping window and its cap, and scheduled
// completion. They need the same environment as app.e2e-spec.ts:
//
//   1. PostgreSQL reachable at DATABASE_URL
//   2. Migrations applied: pnpm --dir apps/api prisma migrate deploy
//   3. Every variable in src/config/env.validation.ts present in apps/api/.env
//
// Run with: pnpm --dir apps/api test:e2e
//
// Every row is created with a generated id and torn down afterwards, so the
// suite can run against a development database without disturbing its data.

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
const ANTI_SNIPING_EXTENSION_MS = 2 * ONE_MINUTE_MS;
const MAX_AUCTION_EXTENSIONS = 5;

type TestAccount = {
  userId: string;
  accessToken: string;
};

type CreateAuctionOptions = {
  endsInMs?: number;
  startingPrice?: string;
  currentPrice?: string;
  minBidIncrement?: string;
  reservePrice?: string | null;
  extensionCount?: number;
  status?: AuctionStatus;
};

describe('Auction bidding (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let lifecycleService: AuctionLifecycleService;

  let seller: TestAccount;
  let firstBidder: TestAccount;
  let secondBidder: TestAccount;
  let categoryId: string;

  const auctionIds: string[] = [];
  const userIds: string[] = [];

  const httpServer = () => app.getHttpServer();

  const registerAccount = async (label: string): Promise<TestAccount> => {
    const email = `e2e-${label}-${randomUUID()}@example.test`;
    const password = 'E2ePassword123!';

    await request(httpServer())
      .post('/auth/register')
      .send({
        firstName: 'E2E',
        lastName: label,
        email,
        password,
        displayName: `E2E ${label}`,
      })
      .expect(201);

    const loginResponse = await request(httpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const body = loginResponse.body as {
      accessToken: string;
      user: { id: string };
    };

    userIds.push(body.user.id);

    return { userId: body.user.id, accessToken: body.accessToken };
  };

  const createAuction = async (
    options: CreateAuctionOptions = {},
  ): Promise<string> => {
    const now = Date.now();
    const endsInMs = options.endsInMs ?? ONE_HOUR_MS;

    const auction = await prisma.auction.create({
      data: {
        sellerId: seller.userId,
        categoryId,
        title: `E2E auction ${randomUUID()}`,
        description: 'Created by the auction bidding end-to-end suite.',
        status: options.status ?? AuctionStatus.ACTIVE,
        currency: 'THB',
        startingPrice: new Prisma.Decimal(options.startingPrice ?? '100.00'),
        currentPrice: new Prisma.Decimal(
          options.currentPrice ?? options.startingPrice ?? '100.00',
        ),
        minBidIncrement: new Prisma.Decimal(options.minBidIncrement ?? '10.00'),
        reservePrice:
          options.reservePrice === undefined || options.reservePrice === null
            ? null
            : new Prisma.Decimal(options.reservePrice),
        extensionCount: options.extensionCount ?? 0,
        scheduledStartAt: new Date(now - ONE_HOUR_MS),
        originalEndAt: new Date(now + endsInMs),
        currentEndAt: new Date(now + endsInMs),
        publishedAt: new Date(now - ONE_HOUR_MS),
        startedAt: new Date(now - ONE_HOUR_MS),
        auctionImages: {
          create: {
            storageKey: `e2e/${randomUUID()}`,
            url: 'https://cdn.test/e2e.jpg',
            altText: 'End-to-end fixture image',
            position: 0,
            isPrimary: true,
          },
        },
      },
      select: { id: true },
    });

    auctionIds.push(auction.id);

    return auction.id;
  };

  const placeBid = (
    auctionId: string,
    account: TestAccount,
    amount: string,
    clientRequestId: string = randomUUID(),
  ) =>
    request(httpServer())
      .post(`/auctions/${auctionId}/bids`)
      .set('Authorization', `Bearer ${account.accessToken}`)
      .send({ amount, clientRequestId });

  const readAuction = (auctionId: string) =>
    prisma.auction.findUniqueOrThrow({
      where: { id: auctionId },
      select: {
        status: true,
        currentPrice: true,
        bidCount: true,
        currentEndAt: true,
        extensionCount: true,
        winnerUserId: true,
        winningBidId: true,
        soldPrice: true,
        endedAt: true,
      },
    });

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);
    lifecycleService = app.get(AuctionLifecycleService);

    const category = await prisma.category.create({
      data: {
        name: `E2E category ${randomUUID()}`,
        slug: `e2e-category-${randomUUID()}`,
        isActive: true,
      },
      select: { id: true },
    });

    categoryId = category.id;

    seller = await registerAccount('seller');
    firstBidder = await registerAccount('bidder-one');
    secondBidder = await registerAccount('bidder-two');
  }, 120_000);

  afterAll(async () => {
    if (prisma) {
      // Ordered so every Restrict foreign key is released before its target.
      await prisma.auction.updateMany({
        where: { id: { in: auctionIds } },
        data: { winningBidId: null, winnerUserId: null },
      });
      await prisma.notification.deleteMany({
        where: { auctionId: { in: auctionIds } },
      });
      await prisma.auctionEvent.deleteMany({
        where: { auctionId: { in: auctionIds } },
      });
      await prisma.auctionExtension.deleteMany({
        where: { auctionId: { in: auctionIds } },
      });
      await prisma.auctionParticipant.deleteMany({
        where: { auctionId: { in: auctionIds } },
      });
      await prisma.watchlist.deleteMany({
        where: { auctionId: { in: auctionIds } },
      });
      await prisma.bid.deleteMany({
        where: { auctionId: { in: auctionIds } },
      });
      await prisma.auctionImage.deleteMany({
        where: { auctionId: { in: auctionIds } },
      });
      await prisma.auction.deleteMany({ where: { id: { in: auctionIds } } });

      await prisma.userSession.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.userProfile.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });

      if (categoryId) {
        await prisma.category.deleteMany({ where: { id: categoryId } });
      }
    }

    await app?.close();
  }, 120_000);

  describe('BID-002 request idempotency', () => {
    it('accepts a bid once and refuses the same client request id', async () => {
      const auctionId = await createAuction();
      const clientRequestId = randomUUID();

      const accepted = await placeBid(
        auctionId,
        firstBidder,
        '110.00',
        clientRequestId,
      ).expect(201);

      const acceptedBody = accepted.body as {
        amount: string;
        sequenceNo: number;
        currentPrice: string;
        bidCount: number;
      };

      expect(acceptedBody.amount).toBe('110.00');
      expect(acceptedBody.sequenceNo).toBe(1);
      expect(acceptedBody.currentPrice).toBe('110.00');

      await placeBid(auctionId, firstBidder, '110.00', clientRequestId).expect(
        409,
      );

      // The retry must not create a second bid or move the price again.
      const storedBids = await prisma.bid.count({ where: { auctionId } });
      const auction = await readAuction(auctionId);

      expect(storedBids).toBe(1);
      expect(auction.bidCount).toBe(1);
      expect(auction.currentPrice.toFixed(2)).toBe('110.00');
    });

    it('never persists a rejected bid', async () => {
      const auctionId = await createAuction();

      // Below the minimum of 100.00 + 10.00.
      await placeBid(auctionId, firstBidder, '105.00').expect(400);

      // The seller may not bid on their own auction.
      await placeBid(auctionId, seller, '110.00').expect(403);

      const storedBids = await prisma.bid.count({ where: { auctionId } });
      const auction = await readAuction(auctionId);

      expect(storedBids).toBe(0);
      expect(auction.bidCount).toBe(0);
      expect(auction.currentPrice.toFixed(2)).toBe('100.00');
    });
  });

  describe('BID-002 concurrent bids', () => {
    it('accepts exactly one of two simultaneous bids at the same amount', async () => {
      const auctionId = await createAuction();

      const responses = await Promise.all([
        placeBid(auctionId, firstBidder, '110.00'),
        placeBid(auctionId, secondBidder, '110.00'),
      ]);

      const statuses = responses.map((response) => response.status).sort();

      expect(statuses).toHaveLength(2);
      expect(statuses.filter((status) => status === 201)).toHaveLength(1);
      // The loser is refused by Serializable isolation or the row-version
      // guard; either way it is a conflict, never a second accepted bid.
      expect(statuses.filter((status) => status === 409)).toHaveLength(1);

      const storedBids = await prisma.bid.findMany({
        where: { auctionId },
        select: { sequenceNo: true },
      });
      const auction = await readAuction(auctionId);

      expect(storedBids).toEqual([{ sequenceNo: 1 }]);
      expect(auction.bidCount).toBe(1);
      expect(auction.currentPrice.toFixed(2)).toBe('110.00');
    });
  });

  describe('BID-004 anti-sniping', () => {
    it('extends an auction by two minutes for a bid in the final window', async () => {
      const auctionId = await createAuction({ endsInMs: ONE_MINUTE_MS });
      const before = await readAuction(auctionId);

      const response = await placeBid(auctionId, firstBidder, '110.00').expect(
        201,
      );

      const body = response.body as {
        extension: {
          extensionNumber: number;
          previousEndAt: string;
          newEndAt: string;
        } | null;
      };

      expect(body.extension).not.toBeNull();
      expect(body.extension?.extensionNumber).toBe(1);

      const previousEndAt = new Date(
        body.extension?.previousEndAt ?? 0,
      ).getTime();
      const newEndAt = new Date(body.extension?.newEndAt ?? 0).getTime();

      expect(previousEndAt).toBe(before.currentEndAt?.getTime());
      expect(newEndAt - previousEndAt).toBe(ANTI_SNIPING_EXTENSION_MS);

      const after = await readAuction(auctionId);
      const storedExtension = await prisma.auctionExtension.findFirst({
        where: { auctionId },
        select: { extensionNumber: true },
      });

      expect(after.extensionCount).toBe(1);
      expect(after.currentEndAt?.getTime()).toBe(newEndAt);
      expect(storedExtension?.extensionNumber).toBe(1);
    });

    it('leaves the deadline alone for a bid outside the final window', async () => {
      const auctionId = await createAuction({ endsInMs: ONE_HOUR_MS });
      const before = await readAuction(auctionId);

      const response = await placeBid(auctionId, firstBidder, '110.00').expect(
        201,
      );

      expect((response.body as { extension: unknown }).extension).toBeNull();

      const after = await readAuction(auctionId);

      expect(after.extensionCount).toBe(0);
      expect(after.currentEndAt?.getTime()).toBe(
        before.currentEndAt?.getTime(),
      );
    });

    it('accepts the bid but stops extending after the fifth extension', async () => {
      const auctionId = await createAuction({
        endsInMs: ONE_MINUTE_MS,
        extensionCount: MAX_AUCTION_EXTENSIONS,
      });
      const before = await readAuction(auctionId);

      const response = await placeBid(auctionId, firstBidder, '110.00').expect(
        201,
      );

      expect((response.body as { extension: unknown }).extension).toBeNull();

      const after = await readAuction(auctionId);

      expect(after.extensionCount).toBe(MAX_AUCTION_EXTENSIONS);
      expect(after.currentEndAt?.getTime()).toBe(
        before.currentEndAt?.getTime(),
      );
      // The bid itself is still accepted.
      expect(after.bidCount).toBe(1);
      expect(after.currentPrice.toFixed(2)).toBe('110.00');
    });
  });

  describe('AUC-007 scheduled completion', () => {
    const countEndedEvents = (auctionId: string) =>
      prisma.auctionEvent.count({
        where: { auctionId, eventType: AuctionEventType.ENDED },
      });

    it('sells an expired auction whose reserve was met and leaves the rest unsold', async () => {
      const soldAuctionId = await createAuction({ reservePrice: '500.00' });
      const belowReserveAuctionId = await createAuction({
        reservePrice: '5000.00',
      });
      const noBidAuctionId = await createAuction();

      await placeBid(soldAuctionId, firstBidder, '600.00').expect(201);
      await placeBid(belowReserveAuctionId, firstBidder, '600.00').expect(201);

      // Expire all three, then let the reconciler close them.
      await prisma.auction.updateMany({
        where: {
          id: {
            in: [soldAuctionId, belowReserveAuctionId, noBidAuctionId],
          },
        },
        data: { currentEndAt: new Date(Date.now() - ONE_MINUTE_MS) },
      });

      await lifecycleService.reconcileAuctionLifecycle();

      const sold = await readAuction(soldAuctionId);
      const belowReserve = await readAuction(belowReserveAuctionId);
      const noBid = await readAuction(noBidAuctionId);

      expect(sold.status).toBe(AuctionStatus.SOLD);
      expect(sold.winnerUserId).toBe(firstBidder.userId);
      expect(sold.winningBidId).not.toBeNull();
      expect(sold.soldPrice?.toFixed(2)).toBe('600.00');
      expect(sold.endedAt).not.toBeNull();

      // A highest bid that never reached the reserve does not win.
      expect(belowReserve.status).toBe(AuctionStatus.UNSOLD);
      expect(belowReserve.winnerUserId).toBeNull();
      expect(belowReserve.soldPrice).toBeNull();

      expect(noBid.status).toBe(AuctionStatus.UNSOLD);
      expect(noBid.winnerUserId).toBeNull();
    });

    it('records one ENDED event however often the reconciler runs', async () => {
      const auctionId = await createAuction({ reservePrice: '500.00' });

      await placeBid(auctionId, firstBidder, '600.00').expect(201);
      await prisma.auction.updateMany({
        where: { id: auctionId },
        data: { currentEndAt: new Date(Date.now() - ONE_MINUTE_MS) },
      });

      await lifecycleService.reconcileAuctionLifecycle();
      await lifecycleService.reconcileAuctionLifecycle();

      const auction = await readAuction(auctionId);

      expect(auction.status).toBe(AuctionStatus.SOLD);
      expect(await countEndedEvents(auctionId)).toBe(1);
    });

    it('activates a scheduled auction whose start time has passed', async () => {
      const auctionId = await createAuction({
        status: AuctionStatus.SCHEDULED,
      });

      await prisma.auction.updateMany({
        where: { id: auctionId },
        data: { scheduledStartAt: new Date(Date.now() - ONE_MINUTE_MS) },
      });

      await lifecycleService.reconcileAuctionLifecycle();

      const auction = await readAuction(auctionId);

      expect(auction.status).toBe(AuctionStatus.ACTIVE);
    });
  });

  describe('AUC-003 reserve privacy', () => {
    it('keeps the reserve amount out of every public response', async () => {
      const auctionId = await createAuction({ reservePrice: '500.00' });

      await placeBid(auctionId, firstBidder, '110.00').expect(201);

      const detail = await request(httpServer())
        .get(`/auctions/${auctionId}`)
        .expect(200);

      const history = await request(httpServer())
        .get(`/auctions/${auctionId}/bids`)
        .expect(200);

      const list = await request(httpServer()).get('/auctions').expect(200);

      const detailBody = detail.body as Record<string, unknown>;

      expect(detailBody).not.toHaveProperty('reservePrice');
      expect(detailBody.reserveMet).toBe(false);
      expect(JSON.stringify(detail.body)).not.toContain('500.00');
      expect(JSON.stringify(history.body)).not.toContain('500.00');
      expect(JSON.stringify(list.body)).not.toContain('reservePrice');
    });

    it('reports the reserve as met once the price reaches it', async () => {
      const auctionId = await createAuction({ reservePrice: '500.00' });

      await placeBid(auctionId, firstBidder, '500.00').expect(201);

      const detail = await request(httpServer())
        .get(`/auctions/${auctionId}`)
        .expect(200);

      const detailBody = detail.body as Record<string, unknown>;

      expect(detailBody.reserveMet).toBe(true);
      expect(detailBody).not.toHaveProperty('reservePrice');
    });

    it('masks bidder identities in the public bid history', async () => {
      const auctionId = await createAuction();

      await placeBid(auctionId, firstBidder, '110.00').expect(201);

      const history = await request(httpServer())
        .get(`/auctions/${auctionId}/bids`)
        .expect(200);

      const body = history.body as {
        items: { bidderDisplayName: string }[];
      };

      expect(body.items).toHaveLength(1);
      expect(body.items[0].bidderDisplayName).not.toContain('bidder-one');
      expect(JSON.stringify(history.body)).not.toContain(firstBidder.userId);
    });
  });
});
