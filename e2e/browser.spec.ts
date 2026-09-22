import { test, expect } from '@playwright/test';

/**
 * browser.spec.ts — does the *built* browser bundle actually work in a real
 * browser, loaded the way a framework-free consumer would (plain
 * `<script type="module">`, no bundler resolving `@vyaz/core`)? Complements
 * `bun test` (Bun, source) and `vitest run` (Node, dist/) — this is the
 * third runtime vyaz's README claims to support ("isomorphic: browser +
 * Bun/Node.js"), and the only one of the three that actually exercises a
 * DOM/real browser JS engine rather than a server-side one.
 */
test('layoutTextFrame + renderToSVG run end-to-end in a real browser', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto('/e2e/browser-harness.html');
  await page.waitForFunction(() => document.getElementById('status')?.textContent !== 'pending');

  const status = await page.locator('#status').textContent();
  expect(pageErrors, `uncaught page errors: ${pageErrors.join('; ')}`).toEqual([]);
  expect(status).toBe('done');

  const result = await page.evaluate(() => (window as any).__vyazResult);
  expect(result.lineCount).toBeGreaterThan(0);
  expect(result.svgLength).toBeGreaterThan(0);

  const svgHost = page.locator('#svg-host svg');
  await expect(svgHost).toHaveCount(1);
  await expect(page.locator('#svg-host')).toContainText('Hello,');
  await expect(page.locator('#svg-host')).toContainText('browser!');
});

test('SystemFontRegistry (node:fs-only) is not exported from the browser bundle', async ({ page }) => {
  await page.goto('/e2e/browser-harness.html');
  const hasSystemFontRegistry = await page.evaluate(async () => {
    const mod = await import('../packages/core/dist/index.browser.js' as string);
    return 'SystemFontRegistry' in mod || 'systemFontRegistry' in mod;
  });
  expect(hasSystemFontRegistry).toBe(false);
});
