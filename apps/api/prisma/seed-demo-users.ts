import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  UserRole,
  UserStatus,
} from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed demo users');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const DEMO_PASSWORD = 'Passw0rd!';
const SALT_ROUNDS = 12;

type UserSeed = {
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  displayName: string;
};

const userSeeds: UserSeed[] = [
  {
    email: 'user1@cbeave.local',
    role: UserRole.USER,
    firstName: 'Ava',
    lastName: 'Nakamura',
    displayName: 'Ava Nakamura',
  },
  {
    email: 'user2@cbeave.local',
    role: UserRole.USER,
    firstName: 'Liam',
    lastName: 'Torres',
    displayName: 'Liam Torres',
  },
  {
    email: 'user3@cbeave.local',
    role: UserRole.USER,
    firstName: 'Sara',
    lastName: 'Chaiyen',
    displayName: 'Sara Chaiyen',
  },
  {
    email: 'user4@cbeave.local',
    role: UserRole.USER,
    firstName: 'Noah',
    lastName: 'Petit',
    displayName: 'Noah Petit',
  },
  {
    email: 'admin1@cbeave.local',
    role: UserRole.ADMIN,
    firstName: 'Mika',
    lastName: 'Suarez',
    displayName: 'Mika Suarez',
  },
  {
    email: 'admin2@cbeave.local',
    role: UserRole.ADMIN,
    firstName: 'Theo',
    lastName: 'Lindqvist',
    displayName: 'Theo Lindqvist',
  },
];

async function seed(): Promise<void> {
  const now = new Date();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  const results: Array<{ email: string; role: UserRole; id: string }> = [];

  for (const userSeed of userSeeds) {
    const user = await prisma.user.upsert({
      where: { email: userSeed.email },
      update: {
        role: userSeed.role,
        status: UserStatus.ACTIVE,
        passwordHash,
        userProfile: {
          upsert: {
            create: {
              firstName: userSeed.firstName,
              lastName: userSeed.lastName,
              displayName: userSeed.displayName,
            },
            update: {
              firstName: userSeed.firstName,
              lastName: userSeed.lastName,
              displayName: userSeed.displayName,
            },
          },
        },
      },
      create: {
        email: userSeed.email,
        role: userSeed.role,
        status: UserStatus.ACTIVE,
        passwordHash,
        emailVerifiedAt: now,
        userProfile: {
          create: {
            firstName: userSeed.firstName,
            lastName: userSeed.lastName,
            displayName: userSeed.displayName,
          },
        },
      },
      select: { id: true, email: true, role: true },
    });

    results.push(user);
  }

  console.log(
    JSON.stringify(
      {
        password: DEMO_PASSWORD,
        users: results,
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
