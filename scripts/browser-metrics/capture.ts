/**
 * capture.ts — freeze the browser oracle.
 *
 *   # 1. build the page
 *   bun scripts/browser-metrics/build-page.ts
 *
 *   # 2a. automated (needs `bun add -d playwright && bunx playwright install chromium`)
 *   bun scripts/browser-metrics/capture.ts
 *
 *   # 2b. manual — open scripts/browser-metrics/page.html in a browser, then in
 *   #     the console:  copy(JSON.stringify(window.__METRICS__))
 *   #     and pipe it in:
 *   pbpaste | bun scripts/browser-metrics/capture.ts
 *
 * Either way it writes one file per (family, weight):
 *   packages/core/tests/fixtures/browser-metrics/<family>-<weight>.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, '../../packages/core/tests/fixtures/browser-metrics');
const PAGE = resolve(HERE, 'page.html');

async function fromPlaywright(): Promise<any | null> {
  let chromium: any;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    return null;
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + PAGE);
  await page.waitForFunction('window.__METRICS__ !== undefined', null, { timeout: 60_000 });
  const metrics = await page.evaluate('window.__METRICS__');
  await browser.close();
  return metrics;
}

function fromStdin(): any | null {
  let raw = '';
  try {
    raw = readFileSync(0, 'utf8').trim();
  } catch {
    return null;
  }
  return raw ? JSON.parse(raw) : null;
}

const metrics = (await fromPlaywright()) ?? fromStdin();
if (!metrics) {
  console.error(
    'No metrics. Either install playwright, or open scripts/browser-metrics/page.html\n' +
      'and pipe `copy(JSON.stringify(window.__METRICS__))` into this script.',
  );
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

const byKey = new Map<string, any[]>();
for (const e of metrics.entries) {
  const key = `${e.family}-${e.weight}`;
  (byKey.get(key) ?? byKey.set(key, []).get(key)!).push(e);
}

for (const [key, entries] of byKey) {
  const file = resolve(OUT_DIR, `${key}.json`);
  const doc = {
    meta: { ...metrics.meta, family: entries[0].family, weight: entries[0].weight, variation: entries[0].variation },
    entries: entries
      .map((e: any) => ({
        script: e.script, category: e.category, s: e.s, size: e.size,
        svgPx: e.svgPx, canvasPx: e.canvasPx,
      }))
      .sort((a: any, b: any) => a.script.localeCompare(b.script) || a.category.localeCompare(b.category) || a.s.localeCompare(b.s) || a.size - b.size),
  };
  writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
  console.log('wrote', file, `(${entries.length} entries)`);
}
