import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../..');
const isCi = Boolean(process.env.CI);

// Browser end-to-end tests drive the built web app against the built API,
// both started below. Production servers rather than `next dev` and
// `nest start --watch`: they start faster, behave like the deployment, and use
// far less memory than Turbopack, which matters with two browser contexts open.
//
// Both applications must be built first — `pnpm test:browser` does that.
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: path.join(repoRoot, 'test-results/browser'),

  // One live auction is shared by the steps of a scenario, so the steps run in
  // order and scenarios do not race each other for the same database.
  fullyParallel: false,
  workers: 1,
  retries: isCi ? 1 : 0,
  timeout: 3 * 60 * 1000,
  expect: { timeout: 15_000 },

  reporter: isCi ? [['list'], ['github']] : 'list',

  use: {
    baseURL: 'http://localhost:3002',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: 'pnpm --dir apps/api start:prod',
      cwd: repoRoot,
      url: 'http://localhost:3001/health/database',
      reuseExistingServer: !isCi,
      timeout: 2 * 60 * 1000,
    },
    {
      command: 'pnpm --dir apps/web exec next start --port 3002',
      cwd: repoRoot,
      url: 'http://localhost:3002',
      reuseExistingServer: !isCi,
      timeout: 2 * 60 * 1000,
    },
  ],
});
