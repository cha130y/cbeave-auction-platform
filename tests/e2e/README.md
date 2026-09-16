# Browser end-to-end tests

Playwright tests that drive the built web app against the built API with real browsers. They cover what no service or API test can: behaviour that only exists when two clients are connected to the same live auction.

## What is covered

`live-auction.spec.ts` is the Week 3 exit criterion from the roadmap, automated: two browser sessions complete a correct real-time auction without refreshing.

| Step | Requirement | What it proves |
|---|---|---|
| A bid reaches the other browser | BID-003 | The bid appears in the second browser's leaderboard with a masked name, and the page was never reloaded |
| A final-window bid starts sudden death | LIV-003 | Both browsers show the extension number and the sudden-death countdown |
| The bid controls stay usable | LIV-005 | Both bidders can still bid during sudden death, one with reduced motion and one without |
| The auction closes | LIV-004 | Both browsers are pushed to the Sold result with the masked winner and winning amount |

Each bidder signs in through the real login form in a separate browser context, so each has its own cookies and socket. Identities are created through the API; the published auction and its deadline are written by `apps/api/test/fixtures/browser-auction.fixture.ts`, because publishing through the UI requires a Cloudinary upload. Every row is removed afterwards.

## Running

The suite needs PostgreSQL with migrations applied and a complete `apps/api/.env`, the same as the API end-to-end suite.

```bash
docker compose -f infra/docker/compose.dev.yml up -d postgres
pnpm --dir apps/api prisma migrate deploy
pnpm exec playwright install chromium   # once per machine

pnpm test:browser                       # builds both apps, then runs the suite
```

When both apps are already built, run the suite on its own:

```bash
pnpm exec playwright test --config tests/e2e/playwright.config.ts
```

Playwright starts the API on port 3001 and the web app on port 3002, and reuses either if it is already running locally. It uses production servers rather than development mode: they behave like the deployment and use far less memory than Turbopack.

On failure, traces and screenshots are written to `test-results/browser`; open a trace with `pnpm exec playwright show-trace <path>/trace.zip`. In CI the same folder is uploaded as the `browser-test-results` artifact.
