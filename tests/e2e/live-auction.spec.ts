import { expect, test, type Browser, type Page } from '@playwright/test';

import {
  createAccount,
  expectPageNotReloaded,
  kingOfTheHill,
  markPage,
  placeBid,
  runFixture,
  signIn,
  type TestAccount,
} from './support';

// The Week 3 exit criterion, automated: two browser sessions complete a
// correct real-time auction without refreshing. It covers the requirements
// whose server broadcasts and client parsing contracts already have unit and
// API end-to-end tests but whose on-screen behaviour did not:
//
//   BID-003  a bid in one browser appears in the other without a reload
//   LIV-003  a final-window bid shows sudden death in both browsers
//   LIV-004  both browsers move to the Sold result when the auction closes
//   LIV-005  animation never blocks the bid controls, in either motion setting

type Fixture = { auctionId: string; categoryId: string };

test.describe('Live auction between two browsers', () => {
  let seller: TestAccount;
  let alpha: TestAccount;
  let bravo: TestAccount;
  let fixture: Fixture;

  test.beforeAll(async ({ request }) => {
    seller = await createAccount(request, 'Seller Browser');
    // Masked in the arena as "A***r" and "B***r".
    alpha = await createAccount(request, 'Alpha Bidder');
    bravo = await createAccount(request, 'Bravo Bidder');

    fixture = runFixture<Fixture>(['create', '--seller', seller.id]);
  });

  test.afterAll(() => {
    if (!fixture) return;

    runFixture([
      'cleanup',
      '--auction',
      fixture.auctionId,
      '--category',
      fixture.categoryId,
      '--users',
      [seller, alpha, bravo]
        .filter(Boolean)
        .map((account) => account.id)
        .join(','),
    ]);
  });

  const openArena = async (
    browser: Browser,
    account: TestAccount,
    reducedMotion: 'reduce' | 'no-preference',
  ): Promise<Page> => {
    // A separate context per bidder gives each its own cookies and socket,
    // exactly as two people on two machines would have.
    const context = await browser.newContext({ reducedMotion });
    const page = await context.newPage();

    await signIn(page, account);
    await page.goto(`/auctions/${fixture.auctionId}/live`);

    await expect(page.getByLabel('Your bid')).toBeVisible();
    await markPage(page);

    return page;
  };

  test('two bidders finish a live auction without refreshing', async ({
    browser,
  }) => {
    const alphaPage = await openArena(browser, alpha, 'no-preference');
    const bravoPage = await openArena(browser, bravo, 'reduce');

    await test.step('BID-003: a bid reaches the other browser live', async () => {
      await placeBid(alphaPage, '150.00');

      const bravoFeed = kingOfTheHill(bravoPage);

      await expect(bravoFeed.getByText('$150.00')).toBeVisible();
      await expect(bravoFeed.getByText('A***r')).toBeVisible();
      await expectPageNotReloaded(bravoPage);
    });

    await test.step('LIV-003: a final-window bid starts sudden death in both browsers', async () => {
      runFixture(['end-soon', '--auction', fixture.auctionId, '--seconds', '60']);

      await placeBid(bravoPage, '200.00');

      for (const page of [alphaPage, bravoPage]) {
        await expect(
          page.getByRole('status').filter({ hasText: 'Extension #1' }),
        ).toBeVisible();
        await expect(page.getByText('SUDDEN DEATH COUNTDOWN')).toBeVisible();
      }

      await expect(kingOfTheHill(alphaPage).getByText('$200.00')).toBeVisible();
      await expectPageNotReloaded(alphaPage);
    });

    await test.step('LIV-005: the bid controls stay usable during sudden death', async () => {
      // Alpha animates and Bravo prefers reduced motion; both must still be
      // able to bid while the sudden-death theme is showing.
      await placeBid(alphaPage, '250.00');
      await expect(kingOfTheHill(bravoPage).getByText('$250.00')).toBeVisible();
    });

    await test.step('LIV-004: both browsers show the result when the auction closes', async () => {
      runFixture(['expire', '--auction', fixture.auctionId]);

      // The API's lifecycle reconciler runs every ten seconds, closes the
      // auction, and only then broadcasts auction:ended.
      for (const page of [alphaPage, bravoPage]) {
        await expect(
          page.getByRole('heading', { name: 'Auction Complete' }),
        ).toBeVisible({ timeout: 45_000 });
        await expect(page.getByText('We have a winner')).toBeVisible();
        await expect(page.getByText('A***r won the auction.')).toBeVisible();

        // Neither browser asked for the result; it was pushed to both.
        await expectPageNotReloaded(page);
      }

      // The winning amount is shown, and the unmasked name never is.
      await expect(bravoPage.getByText('$250.00').first()).toBeVisible();
      await expect(bravoPage.getByText('Alpha Bidder')).toHaveCount(0);
    });
  });
});
