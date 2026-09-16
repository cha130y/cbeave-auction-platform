import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export const API_URL = 'http://localhost:3001';

const apiRoot = path.resolve(__dirname, '../../apps/api');

export type TestAccount = {
  id: string;
  email: string;
  password: string;
};

/**
 * Runs apps/api/test/fixtures/browser-auction.fixture.ts and returns the JSON
 * it prints. That script owns every database write the UI cannot make.
 */
export function runFixture<T>(args: string[]): T {
  // Launch ts-node through the current Node binary rather than the pnpm shim:
  // on Windows the shim is a .cmd file that needs a shell, and a shell would
  // concatenate these arguments instead of passing them through unescaped.
  const tsNode = require.resolve('ts-node/dist/bin.js', { paths: [apiRoot] });

  const output = execFileSync(
    process.execPath,
    [
      tsNode,
      '--transpile-only',
      'test/fixtures/browser-auction.fixture.ts',
      ...args,
    ],
    {
      // The API root, so the fixture's dotenv/config reads apps/api/.env.
      cwd: apiRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    },
  );

  const lastLine = output.trim().split(/\r?\n/).pop() ?? '';

  return JSON.parse(lastLine) as T;
}

/** Registers and signs in through the real API, as the web form would. */
export async function createAccount(
  request: APIRequestContext,
  displayName: string,
): Promise<TestAccount> {
  const email = `browser-e2e-${randomUUID()}@example.test`;
  const password = 'BrowserE2e123!';

  const registered = await request.post(`${API_URL}/auth/register`, {
    data: { firstName: 'Browser', lastName: 'E2E', email, password, displayName },
  });
  expect(registered.status()).toBe(201);

  const signedIn = await request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });
  expect(signedIn.status()).toBe(200);

  const body = (await signedIn.json()) as { user: { id: string } };

  return { id: body.user.id, email, password };
}

/** Signs in through the web login form and waits for the marketplace. */
export async function signIn(page: Page, account: TestAccount): Promise<void> {
  await page.goto('/auth');

  await page.getByLabel('EMAIL ADDRESS').fill(account.email);
  await page.locator('input[autocomplete="current-password"]').fill(account.password);

  // The "Log In" mode tab shares its name with the submit button.
  await page.locator('form').getByRole('button', { name: 'Log In' }).click();

  await page.waitForURL((url) => url.pathname === '/');
}

/**
 * Leaves a marker on the window. A full page reload discards it, so finding it
 * later proves an update arrived over the socket rather than through a refresh.
 */
export async function markPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __browserE2eMarker?: string }).__browserE2eMarker =
      'still-here';
  });
}

export async function expectPageNotReloaded(page: Page): Promise<void> {
  const marker = await page.evaluate(
    () =>
      (window as unknown as { __browserE2eMarker?: string }).__browserE2eMarker,
  );

  expect(marker, 'the page reloaded instead of updating live').toBe(
    'still-here',
  );
}

export function kingOfTheHill(page: Page) {
  // The nearest enclosing section only: the arena nests the leaderboard inside
  // a wider section that also shows the sudden-death triggering bid, which
  // would otherwise match the same amount twice.
  return page
    .getByRole('heading', { name: 'KING OF THE HILL' })
    .locator('xpath=ancestor::section[1]');
}

export async function placeBid(page: Page, amount: string): Promise<void> {
  await page.getByLabel('Your bid').fill(amount);
  // Playwright only clicks once the button is visible, stable, enabled, and not
  // covered by another element, so a successful click is itself a check that
  // no arena animation is sitting on top of the bid controls.
  await page.getByRole('button', { name: 'Place bid', exact: true }).click();

  await expect(
    page.getByRole('status').filter({ hasText: `Bid accepted at $${amount}` }),
  ).toBeVisible();
}
