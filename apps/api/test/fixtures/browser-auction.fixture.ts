import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { AuctionStatus, PrismaClient } from '../../src/generated/prisma/client';

// Database-side fixture for the browser end-to-end suite in tests/e2e.
//
// The browser tests register and sign in through the real API and drive the
// real web app, but two things they need cannot go through the UI: a
// published auction (publication requires a Cloudinary image upload) and a
// deadline moved on demand (to enter sudden death and to end the auction).
// This script does only those, the same way prisma/seed-demo-*.ts writes
// demonstration data, and prints its result as one line of JSON.
//
//   create   --seller <userId>
//   end-soon --auction <auctionId> --seconds <n>
//   expire   --auction <auctionId>
//   cleanup  --auction <auctionId> --category <categoryId> --users <id,id,...>

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required for the browser auction fixture');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const TEN_MINUTES_MS = 10 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

function readOption(name: string): string {
  const index = process.argv.indexOf(`--${name}`);
  const value = index === -1 ? undefined : process.argv[index + 1];

  if (!value) {
    throw new Error(`--${name} is required`);
  }

  return value;
}

async function create(): Promise<unknown> {
  const sellerId = readOption('seller');
  const now = Date.now();
  const suffix = randomUUID();

  const category = await prisma.category.create({
    data: {
      name: `Browser E2E ${suffix}`,
      slug: `browser-e2e-${suffix}`,
      isActive: true,
    },
    select: { id: true },
  });

  const auction = await prisma.auction.create({
    data: {
      sellerId,
      categoryId: category.id,
      title: `Browser E2E auction ${suffix}`,
      description: 'Created by the browser end-to-end suite.',
      status: AuctionStatus.ACTIVE,
      // USD keeps the formatted amounts ("$110.00") independent of locale data.
      currency: 'USD',
      startingPrice: '100.00',
      currentPrice: '100.00',
      minBidIncrement: '10.00',
      scheduledStartAt: new Date(now - ONE_HOUR_MS),
      originalEndAt: new Date(now + TEN_MINUTES_MS),
      currentEndAt: new Date(now + TEN_MINUTES_MS),
      publishedAt: new Date(now - ONE_HOUR_MS),
      startedAt: new Date(now - ONE_HOUR_MS),
      auctionImages: {
        create: {
          storageKey: `browser-e2e/${suffix}`,
          // Served from apps/web/public, so no image host is involved.
          url: '/seed-auctions/collectible-watch.svg',
          altText: 'Browser end-to-end fixture',
          position: 0,
          isPrimary: true,
        },
      },
    },
    select: { id: true },
  });

  return { auctionId: auction.id, categoryId: category.id };
}

async function moveDeadline(offsetMs: number): Promise<unknown> {
  const auctionId = readOption('auction');

  // updateMany so a missing auction reports count 0 instead of throwing.
  const result = await prisma.auction.updateMany({
    where: { id: auctionId, status: AuctionStatus.ACTIVE },
    data: { currentEndAt: new Date(Date.now() + offsetMs) },
  });

  if (result.count !== 1) {
    throw new Error(`Active auction ${auctionId} was not found`);
  }

  return { auctionId };
}

async function cleanup(): Promise<unknown> {
  const auctionId = readOption('auction');
  const categoryId = readOption('category');
  const userIds = readOption('users').split(',').filter(Boolean);
  const byAuction = { where: { auctionId } };

  // Ordered so every Restrict foreign key is released before its target.
  await prisma.auction.updateMany({
    where: { id: auctionId },
    data: { winningBidId: null, winnerUserId: null },
  });
  await prisma.notification.deleteMany(byAuction);
  await prisma.auctionEvent.deleteMany(byAuction);
  await prisma.auctionExtension.deleteMany(byAuction);
  await prisma.auctionParticipant.deleteMany(byAuction);
  await prisma.watchlist.deleteMany(byAuction);
  await prisma.bid.deleteMany(byAuction);
  await prisma.auctionImage.deleteMany(byAuction);
  await prisma.auction.deleteMany({ where: { id: auctionId } });
  await prisma.category.deleteMany({ where: { id: categoryId } });

  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auctionParticipant.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.userSession.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userProfile.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  return { removed: true };
}

const commands: Record<string, () => Promise<unknown>> = {
  create,
  'end-soon': () => moveDeadline(Number(readOption('seconds')) * 1000),
  expire: () => moveDeadline(-1000),
  cleanup,
};

async function main(): Promise<void> {
  const command = commands[process.argv[2] ?? ''];

  if (!command) {
    throw new Error(
      `Unknown command "${process.argv[2]}". Use: ${Object.keys(commands).join(', ')}`,
    );
  }

  process.stdout.write(`${JSON.stringify(await command())}\n`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
