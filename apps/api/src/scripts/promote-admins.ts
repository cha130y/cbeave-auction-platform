import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { UserRole } from '../generated/prisma/enums';

/**
 * Turns existing accounts into admins, named by email in ADMIN_EMAILS.
 *
 * No endpoint changes a role, deliberately: an API that can hand out ADMIN is
 * an API that can be tricked into handing out ADMIN. Someone who is to become
 * an administrator signs up through the normal web flow, with their own
 * password, and an operator promotes that account afterwards.
 *
 * It only moves an account that already exists from USER to ADMIN. It creates
 * nobody, sets no password, and touches no other field.
 *
 * On a deployed environment run it from the platform console, so the database
 * is reached over the private network and nothing has to be exposed:
 *
 *   node apps/api/dist/scripts/promote-admins.js
 *
 * Set ADMIN_EMAILS in the platform dashboard as a bare comma-separated list.
 * Quotes belong in a .env file, where dotenv strips them, not in a dashboard
 * that passes them through verbatim.
 *
 * Re-running is harmless: an account that is already an admin is reported and
 * left alone. Add someone later by extending ADMIN_EMAILS and running again.
 */

const SURROUNDING_QUOTES = /^(["'])(.*)\1$/s;

type Outcome =
  | { kind: 'promoted'; email: string }
  | { kind: 'already'; email: string }
  | { kind: 'missing'; email: string }
  | { kind: 'ambiguous'; email: string; found: string[] };

function readEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim() ?? '';

  if (raw.length === 0) {
    throw new Error(
      'ADMIN_EMAILS is not set. Give it the addresses to promote, separated by\n' +
        'commas, and make sure each one has already signed up:\n\n' +
        '  ADMIN_EMAILS=one@example.com,two@example.com\n',
    );
  }

  // A value carried from .env into a dashboard usually keeps the quotes it had
  // there. Left in place they become part of the first and last address, and
  // the run then reports two accounts that do not exist rather than the real
  // problem, so strip one surrounding pair and say so.
  const quoted = SURROUNDING_QUOTES.exec(raw);

  if (quoted) {
    console.warn(
      'ADMIN_EMAILS was wrapped in quotes; ignoring them. Set the value without\n' +
        'quotes: a dashboard is not a .env file and does not strip them.\n',
    );
  }

  const emails = [
    ...new Set(
      (quoted ? quoted[2] : raw)
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  if (emails.length === 0) {
    throw new Error('ADMIN_EMAILS contained no addresses.');
  }

  return emails;
}

async function promote(prisma: PrismaClient, email: string): Promise<Outcome> {
  // Every write path lowercases an address before storing it, so an exact match
  // is the normal case. The comparison stays case-insensitive to also reach a
  // row written before that normalization existed, which would otherwise be
  // reported as a missing account.
  const matches = await prisma.user.findMany({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, email: true, role: true },
  });

  if (matches.length === 0) {
    return { kind: 'missing', email };
  }

  // Two accounts differing only in case is not something to resolve by guessing
  // which one was meant.
  if (matches.length > 1) {
    return {
      kind: 'ambiguous',
      email,
      found: matches.map((match) => match.email),
    };
  }

  const user = matches[0];

  if (user.role === UserRole.ADMIN) {
    return { kind: 'already', email: user.email };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: UserRole.ADMIN },
  });

  return { kind: 'promoted', email: user.email };
}

function report(outcome: Outcome): void {
  switch (outcome.kind) {
    case 'promoted':
      console.log(`  promoted   ${outcome.email}`);
      break;
    case 'already':
      console.log(`  already    ${outcome.email}`);
      break;
    case 'missing':
      console.log(`  no account ${outcome.email}`);
      break;
    case 'ambiguous':
      console.log(
        `  ambiguous  ${outcome.email} matches ${outcome.found.join(', ')}`,
      );
      break;
  }
}

async function main(): Promise<void> {
  const emails = readEmails();
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set.');
  }

  // The schema declares no datasource url, so a client only reaches the
  // database through this adapter, the same way PrismaService builds one.
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const outcomes: Outcome[] = [];

  try {
    for (const email of emails) {
      outcomes.push(await promote(prisma, email));
    }
  } finally {
    await prisma.$disconnect();
  }

  outcomes.forEach(report);

  const promoted = outcomes.filter(
    (outcome) => outcome.kind === 'promoted',
  ).length;
  const unresolved = outcomes.filter(
    (outcome) => outcome.kind === 'missing' || outcome.kind === 'ambiguous',
  ).length;

  console.log(
    `\n${promoted} promoted, ${outcomes.length - promoted - unresolved} already admin, ${unresolved} unresolved.`,
  );

  if (promoted > 0) {
    console.log(
      'An admin can suspend accounts, cancel any auction, and manage categories,\n' +
        'so keep this list to the people who need it.',
    );
  }

  // An address that matched nothing is almost always a typo or somebody who has
  // not signed up yet. Both deserve a failing exit code rather than a line
  // buried in output nobody reads to the end.
  if (unresolved > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
