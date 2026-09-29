/**
 * capture-line-box.ts — freeze Chrome's line-box geometry as an oracle.
 *
 *   bun scripts/browser-metrics/capture-line-box.ts
 *   → packages/core/tests/fixtures/browser-line-box/line-box.json
 *
 * Needs `bunx playwright install chromium` (one-time). Headless Chromium lays
 * out on a 1 CSS px grid at any `deviceScaleFactor`, which is what the
 * `browser` mode models (`BROWSER_PIXEL_GRID`).
 *
 * For every fixture font × size × line-height it measures, in a
 * `white-space: nowrap` block:
 *   - `height`    — one line's box height (block height),
 *   - `baseline`  — the top of a 0×0 `inline-block` sitting on the baseline,
 *   - `height3`   — three hard-broken lines, to pin the line pitch.
 * Plus a handful of mixed-size lines (several runs, one family per line).
 * `browser-line-box.test.ts` lays the same text out with vyaz and compares.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = resolve(HERE, '../../packages/core/tests/fixtures');
const OUT_DIR = resolve(FIX, 'browser-line-box');

/** family (as registered by `registerFixtureFonts` / `registerUnifont`) → file */
const FONTS: Record<string, string> = {
  Roboto: 'Roboto-VariableFont_wdth,wght.ttf',
  Inter: 'Inter-Variable.ttf',
  GreatVibes: 'GreatVibes-Regular.ttf',
  Unifont: 'unifont-17.0.05.otf',
};
const SIZES = [8, 10, 11, 12, 13, 13.5, 14, 15, 16, 17, 17.3, 18, 20, 24, 32, 48, 72];
const LINE_HEIGHTS = [1, 1.15, 1.2, 1.4, 1.5, 2];
const TEXT = 'Hxgyj';
/** Mixed-size lines: run sizes on one line. The block's own font is the smallest run. */
const MIXED: number[][] = [[12, 24], [24, 12], [10, 16, 13.5], [14, 36], [16, 17.3], [9, 48, 11]];

const faces = Object.entries(FONTS)
  .map(([fam, file]) =>
    `@font-face{font-family:'${fam}';font-weight:1 1000;src:url(data:font/ttf;base64,${readFileSync(resolve(FIX, file)).toString('base64')})}`)
  .join('\n');

const html = `<!doctype html><meta charset="utf-8"><style>${faces}
body{margin:0} .ln{white-space:nowrap;margin:0;padding:0} .mk{display:inline-block;width:0;height:0}</style><body>`;

const { chromium } = await import('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html);
await page.evaluate(async (fams) => {
  for (const f of fams) await (document as any).fonts.load(`16px '${f}'`);
}, Object.keys(FONTS));

const result = await page.evaluate(({ fams, sizes, lhs, text, mixed }) => {
  const measure = (fam: string, blockSize: number, lh: number, runs: number[]) => {
    const div = document.createElement('div');
    div.className = 'ln';
    div.style.font = `${blockSize}px/${lh} '${fam}'`;
    div.innerHTML = runs.map((s) => `<span style="font-size:${s}px">${text}</span>`).join('') + '<span class="mk"></span>';
    const div3 = div.cloneNode(false) as HTMLElement;
    div3.innerHTML = [0, 1, 2].map(() => runs.map((s) => `<span style="font-size:${s}px">${text}</span>`).join('')).join('<br>');
    document.body.append(div, div3);
    const r = div.getBoundingClientRect();
    const m = (div.querySelector('.mk') as HTMLElement).getBoundingClientRect();
    const out = { height: r.height, baseline: m.top - r.top, height3: div3.getBoundingClientRect().height };
    div.remove(); div3.remove();
    return out;
  };
  const single: any[] = [];
  const multi: any[] = [];
  for (const fam of fams) {
    for (const size of sizes) for (const lh of lhs) single.push({ family: fam, size, lineHeight: lh, ...measure(fam, size, lh, [size]) });
    for (const runs of mixed) for (const lh of lhs) multi.push({ family: fam, sizes: runs, lineHeight: lh, ...measure(fam, Math.min(...runs), lh, runs) });
  }
  return { single, multi };
}, { fams: Object.keys(FONTS), sizes: SIZES, lhs: LINE_HEIGHTS, text: TEXT, mixed: MIXED });

const version = browser.version();
await browser.close();

mkdirSync(OUT_DIR, { recursive: true });
const file = resolve(OUT_DIR, 'line-box.json');
const rows = (xs: unknown[]) => xs.map((x) => '  ' + JSON.stringify(x)).join(',\n');
const meta = { browser: `chromium ${version}`, text: TEXT, capturedAt: new Date().toISOString().slice(0, 10) };
writeFileSync(file,
  `{\n "meta": ${JSON.stringify(meta)},\n "single": [\n${rows(result.single)}\n ],\n "multi": [\n${rows(result.multi)}\n ]\n}\n`);
console.log(`wrote ${file} (${result.single.length} single, ${result.multi.length} mixed)`);
