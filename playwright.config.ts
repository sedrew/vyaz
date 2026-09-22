import { defineConfig } from '@playwright/test';

/**
 * playwright.config.ts — real-browser smoke test for the built browser
 * bundles (see e2e/browser-harness.html, e2e/browser.spec.ts).
 *
 * `webServer` serves the whole repo root as static files so the harness
 * page's relative imports (`../packages/core/dist/index.browser.js`) and
 * its `fetch('/packages/core/tests/fixtures/...')` call resolve without a
 * bundler — this is the "vanilla JS, no framework" consumption path.
 * Requires `bun run build` to have already produced dist/.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'bunx serve . -l 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
