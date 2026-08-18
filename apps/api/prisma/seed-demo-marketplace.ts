import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AuctionEventType,
  AuctionStatus,
  Prisma,
  PrismaClient,
  UserRole,
  UserStatus,
} from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed demo marketplace data');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const categorySeeds = [
  {
    name: 'Vintage Cameras',
    slug: 'vintage-cameras',
    description:
      'Film cameras, lenses, darkroom equipment, and collectible photography gear.',
  },
  {
    name: 'Collectible Watches',
    slug: 'collectible-watches',
    description:
      'Mechanical watches, heritage timepieces, and sought-after watch accessories.',
  },
  {
    name: 'Gaming & Retro Tech',
    slug: 'gaming-retro-tech',
    description:
      'Classic consoles, vintage computers, games, and nostalgic electronics.',
  },
  {
    name: 'Art & Design',
    slug: 'art-design',
    description:
      'Original artwork, collectible prints, studio ceramics, and design objects.',
  },
] as const;

type AuctionSeed = {
  categorySlug: (typeof categorySeeds)[number]['slug'];
  title: string;
  description: string;
  startingPrice: string;
  reservePrice: string;
  minBidIncrement: string;
  status: 'ACTIVE' | 'SCHEDULED';
  imageFile: string;
  imageAlt: string;
};

const auctionSeeds: AuctionSeed[] = [
  {
    categorySlug: 'vintage-cameras',
    title: 'Leica M6 Classic Rangefinder',
    description:
      'A carefully maintained Leica M6 body with bright rangefinder patch, smooth film advance, and only light cosmetic wear. Includes body cap and leather strap.',
    startingPrice: '1450.00',
    reservePrice: '1900.00',
    minBidIncrement: '50.00',
    status: AuctionStatus.ACTIVE,
    imageFile: 'vintage-camera.svg',
    imageAlt: 'Vintage rangefinder camera on a warm studio background',
  },
  {
    categorySlug: 'vintage-cameras',
    title: 'Hasselblad 500C/M Medium Format Kit',
    description:
      'Classic 500C/M kit with waist-level finder, A12 film back, and 80mm lens. Shutter speeds have been checked and all controls operate cleanly.',
    startingPrice: '1200.00',
    reservePrice: '1650.00',
    minBidIncrement: '40.00',
    status: AuctionStatus.SCHEDULED,
    imageFile: 'vintage-camera.svg',
    imageAlt: 'Classic medium-format camera in a collector display',
  },
  {
    categorySlug: 'collectible-watches',
    title: 'Omega Seamaster 300 Heritage',
    description:
      'A modern heritage diver with steel bracelet, luminous dial, and presentation box. Running strongly and presented in excellent pre-owned condition.',
    startingPrice: '2800.00',
    reservePrice: '3400.00',
    minBidIncrement: '100.00',
    status: AuctionStatus.ACTIVE,
    imageFile: 'collectible-watch.svg',
    imageAlt: 'Luxury mechanical watch with a blue dial',
  },
  {
    categorySlug: 'collectible-watches',
    title: 'Seiko 6139 Pogue Chronograph',
    description:
      'Iconic automatic chronograph with vivid yellow dial and period-correct bracelet. Recently inspected, with chronograph start, stop, and reset functioning.',
    startingPrice: '650.00',
    reservePrice: '900.00',
    minBidIncrement: '25.00',
    status: AuctionStatus.SCHEDULED,
    imageFile: 'collectible-watch.svg',
    imageAlt: 'Vintage automatic chronograph on a dark display surface',
  },
  {
    categorySlug: 'gaming-retro-tech',
    title: 'Nintendo Game Boy Color Collector Set',
    description:
      'Working translucent Game Boy Color with protective case, link cable, and six tested cartridges. Screen and controls are responsive with minimal wear.',
    startingPrice: '180.00',
    reservePrice: '260.00',
    minBidIncrement: '10.00',
    status: AuctionStatus.ACTIVE,
    imageFile: 'retro-gaming.svg',
    imageAlt: 'Retro handheld game console with colorful controls',
  },
  {
    categorySlug: 'gaming-retro-tech',
    title: 'Apple Macintosh Classic II',
    description:
      'Compact Macintosh Classic II with keyboard and mouse. Boots successfully and includes a curated collection of period software for display and use.',
    startingPrice: '420.00',
    reservePrice: '600.00',
    minBidIncrement: '20.00',
    status: AuctionStatus.SCHEDULED,
    imageFile: 'retro-gaming.svg',
    imageAlt: 'Retro personal computer with a glowing screen',
  },
  {
    categorySlug: 'art-design',
    title: 'Bauhaus Exhibition Poster, 1923 Reprint',
    description:
      'Museum-quality archival reprint celebrating the 1923 Bauhaus exhibition. Professionally framed behind UV-protective acrylic and ready to hang.',
    startingPrice: '120.00',
    reservePrice: '200.00',
    minBidIncrement: '10.00',
    status: AuctionStatus.ACTIVE,
    imageFile: 'art-design.svg',
    imageAlt: 'Geometric Bauhaus-style artwork in a gallery frame',
  },
  {
    categorySlug: 'art-design',
    title: 'Hand-thrown Celadon Ceramic Vase',
    description:
      'One-of-a-kind stoneware vase with a layered celadon glaze, subtle crackle finish, and signed base. Fired in a small independent studio.',
    startingPrice: '160.00',
    reservePrice: '240.00',
    minBidIncrement: '10.00',
    status: AuctionStatus.SCHEDULED,
    imageFile: 'art-design.svg',
    imageAlt: 'Handcrafted celadon vase against an artistic backdrop',
  },
];

async function seed(): Promise<void> {
  const now = new Date();
  const activeStart = new Date(now.getTime() - 60 * 60 * 1000);
  const activeEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const scheduledStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const scheduledEnd = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

  const admin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    select: { id: true },
  });

  const seller = await prisma.user.upsert({
    where: { email: 'demo-seller@cbeave.local' },
    update: {
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      userProfile: {
        upsert: {
          create: {
            firstName: 'CBeave',
            lastName: 'Demo Seller',
            displayName: 'CBeave Curated',
            bio: 'Curated demo listings for the CBeave marketplace.',
          },
          update: {
            displayName: 'CBeave Curated',
            bio: 'Curated demo listings for the CBeave marketplace.',
          },
        },
      },
    },
    create: {
      email: 'demo-seller@cbeave.local',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: now,
      userProfile: {
        create: {
          firstName: 'CBeave',
          lastName: 'Demo Seller',
          displayName: 'CBeave Curated',
          bio: 'Curated demo listings for the CBeave marketplace.',
        },
      },
    },
    select: { id: true },
  });

  const categories = new Map<string, string>();

  for (const categorySeed of categorySeeds) {
    const category = await prisma.category.upsert({
      where: { slug: categorySeed.slug },
      update: {
        name: categorySeed.name,
        description: categorySeed.description,
        isActive: true,
      },
      create: {
        ...categorySeed,
        isActive: true,
        createdByAdminId: admin?.id ?? null,
      },
      select: { id: true, slug: true },
    });

    categories.set(category.slug, category.id);
  }

  let createdAuctions = 0;
  let updatedAuctions = 0;

  for (const auctionSeed of auctionSeeds) {
    const categoryId = categories.get(auctionSeed.categorySlug);

    if (!categoryId) {
      throw new Error(`Missing seeded category ${auctionSeed.categorySlug}`);
    }

    const existingAuction = await prisma.auction.findFirst({
      where: {
        sellerId: seller.id,
        title: auctionSeed.title,
        deletedAt: null,
      },
      select: { id: true },
    });

    const schedule =
      auctionSeed.status === AuctionStatus.ACTIVE
        ? {
            scheduledStartAt: activeStart,
            originalEndAt: activeEnd,
            currentEndAt: activeEnd,
            startedAt: activeStart,
          }
        : {
            scheduledStartAt: scheduledStart,
            originalEndAt: scheduledEnd,
            currentEndAt: scheduledEnd,
            startedAt: null,
          };

    const auctionData = {
      sellerId: seller.id,
      categoryId,
      title: auctionSeed.title,
      description: auctionSeed.description,
      status: auctionSeed.status,
      currency: 'USD',
      startingPrice: new Prisma.Decimal(auctionSeed.startingPrice),
      reservePrice: new Prisma.Decimal(auctionSeed.reservePrice),
      minBidIncrement: new Prisma.Decimal(auctionSeed.minBidIncrement),
      currentPrice: new Prisma.Decimal(auctionSeed.startingPrice),
      publishedAt: now,
      deletedAt: null,
      ...schedule,
    };

    const auction = existingAuction
      ? await prisma.auction.update({
          where: { id: existingAuction.id },
          data: auctionData,
          select: { id: true },
        })
      : await prisma.auction.create({
          data: auctionData,
          select: { id: true },
        });

    if (existingAuction) {
      updatedAuctions += 1;
    } else {
      createdAuctions += 1;
      await prisma.auctionEvent.createMany({
        data: [
          {
            auctionId: auction.id,
            actorUserId: seller.id,
            eventType: AuctionEventType.CREATED,
          },
          {
            auctionId: auction.id,
            actorUserId: seller.id,
            eventType: AuctionEventType.PUBLISHED,
          },
          ...(auctionSeed.status === AuctionStatus.ACTIVE
            ? [
                {
                  auctionId: auction.id,
                  actorUserId: seller.id,
                  eventType: AuctionEventType.STARTED,
                },
              ]
            : []),
        ],
      });
    }

    const imageStorageName = auctionSeed.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const storageKey = `seed-auctions/${imageStorageName}.svg`;

    await prisma.auctionImage.upsert({
      where: { storageKey },
      update: {
        auctionId: auction.id,
        url: `/seed-auctions/${auctionSeed.imageFile}`,
        altText: auctionSeed.imageAlt,
        position: 0,
        isPrimary: true,
      },
      create: {
        auctionId: auction.id,
        storageKey,
        url: `/seed-auctions/${auctionSeed.imageFile}`,
        altText: auctionSeed.imageAlt,
        position: 0,
        isPrimary: true,
      },
    });
  }

  const verifiedCategoryCount = await prisma.category.count({
    where: {
      slug: { in: categorySeeds.map((category) => category.slug) },
      isActive: true,
    },
  });
  const verifiedAuctions = await prisma.auction.findMany({
    where: {
      sellerId: seller.id,
      title: { in: auctionSeeds.map((auction) => auction.title) },
      status: { in: [AuctionStatus.ACTIVE, AuctionStatus.SCHEDULED] },
      publishedAt: { not: null },
      currentEndAt: { gt: now },
      deletedAt: null,
      auctionImages: { some: { isPrimary: true } },
    },
    select: { id: true },
  });

  if (
    verifiedCategoryCount !== categorySeeds.length ||
    verifiedAuctions.length !== auctionSeeds.length
  ) {
    throw new Error('Demo marketplace seed verification failed');
  }

  console.log(
    JSON.stringify(
      {
        categories: verifiedCategoryCount,
        auctionsCreated: createdAuctions,
        auctionsUpdated: updatedAuctions,
        activeAuctions: auctionSeeds.filter(
          (auction) => auction.status === AuctionStatus.ACTIVE,
        ).length,
        scheduledAuctions: auctionSeeds.filter(
          (auction) => auction.status === AuctionStatus.SCHEDULED,
        ).length,
        publicAuctionsVerified: verifiedAuctions.length,
      },
      null,
      2,
    ),
  );
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
