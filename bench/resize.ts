/**
 * resize.ts — re-layout cost when only `width` changes (drag-resize a panel,
 * a responsive breakpoint, a live-editor column split), for both TextFrame
 * and TableFrame.
 *
 *   bun run bench:resize
 *   RESIZE_STEPS=60 bun run bench:resize                       # longer drag
 *   RESIZE_MIN=200 RESIZE_MAX=1600 bun run bench:resize         # wider sweep
 *   RESIZE_TEXT_SIZES=1000,100000 bun run bench:resize
 *   RESIZE_GRIDS=20x20,100x100 bun run bench:resize
 *
 * A resize call reuses the *same* TextFrame/TableFrame object, only `width`
 * changes each step (`{ ...frame, width }` — a cheap shallow spread; the
 * paragraph/cell objects underneath keep their identity). That matters
 * because `ParagraphLayoutEngine`'s prepare-cache
 * (`preparedCacheKey`, TextFrameLayoutEngine.ts) keys on paragraph *content*
 * (text + per-run style), not on width — so unlike the "layout cold" numbers
 * in throughput.ts / table-throughput.ts (unique text every call, guaranteed
 * cache miss), a resize should hit the cache on every step after the first.
 * This bench measures what's left once that expensive prepare step is
 * skipped: line re-breaking (`positionLines`/`runFlow`) and, for tables, the
 * two-pass column/row re-measurement (`layoutTableFrame` still reruns both
 * passes from scratch on every call — no cross-call cache there, only the
 * per-cell paragraph prepare-cache underneath it).
 *
 * "cold" alongside each row is one fresh (unique-text) layout at the same
 * size, for scale — the gap between "cold" and "resize step (min)" is
 * roughly the prepare-cache's contribution.
 *
 * Width sweeps a triangle wave (RESIZE_MIN → RESIZE_MAX → RESIZE_MIN) over
 * RESIZE_STEPS steps, simulating a drag out and back rather than one jump.
 * "total (drag)" is the sum of all steps — what one drag gesture costs the
 * main thread; "min/step" is the steady-state per-frame cost once the JIT
 * and prepare-cache are warm, the number that matters for a 16.7ms
 * (60fps) frame budget.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fontMetricsProvider } from '../packages/core/src/measure/FontMetricsProvider.js';
import { layoutTextFrame } from '../packages/core/src/layout/TextFrameLayoutEngine.js';
import { layoutTableFrame } from '../packages/core/src/layout/TableLayoutEngine.js';
import type { TextFrame, Paragraph, TextRun } from '../packages/core/src/types/Document.js';
import type { TableFrame, TableCell, TableRow } from '../packages/core/src/types/TableTypes.js';

// ── setup ───────────────────────────────────────────────────────────────
const FONT = resolve(import.meta.dir, '../packages/core/tests/fixtures/unifont-17.0.05.otf');
await fontMetricsProvider.registerFont('Unifont', { weight: 'normal', style: 'normal' }, readFileSync(FONT));

const STEPS = Number(process.env.RESIZE_STEPS ?? 30);
const WIDTH_MIN = Number(process.env.RESIZE_MIN ?? 300);
const WIDTH_MAX = Number(process.env.RESIZE_MAX ?? 1200);

/** Triangle wave: MIN → MAX → MIN over `steps`, sampled at step `i`. */
function widthAt(i: number, steps: number): number {
  const t = (i % steps) / steps;
  const tri = t < 0.5 ? t * 2 : 2 - t * 2; // 0 → 1 → 0
  return Math.round(WIDTH_MIN + (WIDTH_MAX - WIDTH_MIN) * tri);
}

function stats(t: number[]): { min: number; median: number; max: number; total: number } {
  const s = [...t].sort((a, b) => a - b);
  return { min: s[0], median: s[(s.length / 2) | 0], max: s[s.length - 1], total: t.reduce((a, b) => a + b, 0) };
}

const fmt = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(3)}ms`);

// ── text ────────────────────────────────────────────────────────────────
const WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore'.split(' ');
const RUNS_PER_PARA = 50;

function makeTextFrame(nRuns: number, width: number, salt = ''): TextFrame {
  const paras: Paragraph[] = [];
  let made = 0;
  while (made < nRuns) {
    const count = Math.min(RUNS_PER_PARA, nRuns - made);
    const children: TextRun[] = [];
    for (let i = 0; i < count; i++) {
      const g = made + i;
      children.push({
        type: 'text',
        text: (g === 0 ? salt : '') + WORDS[g % WORDS.length] + ' ',
        fontFamily: 'Unifont',
        fontSize: g % 17 === 0 ? 20 : 13,
        fontWeight: g % 3 === 0 ? 'bold' : 'normal',
        fontStyle: g % 11 === 0 ? 'italic' : 'normal',
        color: '#000',
      });
    }
    paras.push({ style: { alignment: 'left', lineHeight: 1.3, spaceBefore: 0, spaceAfter: 6, whiteSpace: 'normal' }, children });
    made += count;
  }
  return { width, wrap: true, paragraphs: paras };
}

const TEXT_SIZES = (process.env.RESIZE_TEXT_SIZES ? process.env.RESIZE_TEXT_SIZES.split(',').map(Number) : [1_000, 10_000, 100_000]);
const COLD_ITERS = Math.max(3, Math.min(10, STEPS)); // min-of-N, same methodology as the resize steps — a single cold sample is too noisy to compare against

// ── print ───────────────────────────────────────────────────────────────
function printTable(head: string[], rows: string[][]) {
  const widths = head.map((h, c) => Math.max(h.length, ...rows.map((r) => r[c].length)));
  const line = (r: string[]) => '  ' + r.map((c, i) => c.padEnd(widths[i])).join('  │  ');
  console.log(line(head));
  console.log('  ' + widths.map((w) => '─'.repeat(w)).join('──┼──'));
  for (const r of rows) console.log(line(r));
  console.log();
}

const HEAD = ['size', `total (${STEPS}-step drag)`, 'min/step', 'median/step', 'max/step', `cold (min of ${COLD_ITERS}, fresh)`, 'cold/min'];

console.log(`\nvyaz resize throughput   (Unifont, width ${WIDTH_MIN}→${WIDTH_MAX}→${WIDTH_MIN} over ${STEPS} steps)\n`);
console.log('## Text (TextFrame)\n');

const textRows: string[][] = [];
for (const n of TEXT_SIZES) {
  const frame = makeTextFrame(n, WIDTH_MIN);
  layoutTextFrame(frame); // prime the prepare-cache, same as a real first paint

  const times: number[] = [];
  for (let i = 0; i < STEPS; i++) {
    const w = widthAt(i, STEPS);
    const t0 = performance.now();
    layoutTextFrame({ ...frame, width: w });
    times.push(performance.now() - t0);
  }
  const s = stats(times);

  const coldTimes: number[] = [];
  for (let i = 0; i < COLD_ITERS; i++) {
    const t0 = performance.now();
    layoutTextFrame(makeTextFrame(n, WIDTH_MIN, `cold${i}_`)); // unique text each time — guaranteed prepare-cache miss
    coldTimes.push(performance.now() - t0);
  }
  const cold = Math.min(...coldTimes);

  textRows.push([n.toLocaleString(), fmt(s.total), fmt(s.min), fmt(s.median), fmt(s.max), fmt(cold), `${(cold / s.min).toFixed(1)}x`]);
}
printTable(HEAD, textRows);

// ── tables ──────────────────────────────────────────────────────────────
const CELL_STYLE = { paddings: 4, borderWidths: 1, borderColors: '#c0c8d4' };

function cell(text: string): TableCell {
  return {
    content: {
      wrap: true,
      paragraphs: [{
        style: { alignment: 'center', lineHeight: 1.2, spaceBefore: 0, spaceAfter: 0 },
        children: [{ type: 'text', text, fontFamily: 'Unifont', fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', color: '#111' }],
      }],
    },
    style: CELL_STYLE,
  };
}

/** `salt` on every cell (not just one) — a real prepare-cache-miss baseline needs every cell's text to be unique, not just one corner. */
function buildTable(rows: number, cols: number, salt = ''): TableFrame {
  const header: TableRow = { style: { bgColor: '#e9ecf2' }, cells: [cell(salt + '#'), ...Array.from({ length: cols }, (_, i) => cell(salt + String(i + 1)))] };
  const body: TableRow[] = [];
  for (let r = 1; r <= rows; r++) {
    const cells: TableCell[] = [cell(salt + String(r))];
    for (let c = 1; c <= cols; c++) cells.push(cell(salt + String(r * c)));
    body.push({ cells });
  }
  return { rows: [header, ...body], defaultCellStyle: CELL_STYLE };
}

const GRIDS = (process.env.RESIZE_GRIDS ? process.env.RESIZE_GRIDS.split(',') : ['20x20', '50x50', '100x100'])
  .map((g) => g.split('x').map(Number) as [number, number]);

console.log('## Tables (TableFrame)\n');

const tableRows: string[][] = [];
for (const [rows, cols] of GRIDS) {
  const table = buildTable(rows, cols);
  layoutTableFrame(table); // prime every cell's prepare-cache entry

  const times: number[] = [];
  for (let i = 0; i < STEPS; i++) {
    const w = widthAt(i, STEPS) * Math.max(1, cols / 10); // wider grids need a wider sweep to matter
    const t0 = performance.now();
    layoutTableFrame({ ...table, width: w });
    times.push(performance.now() - t0);
  }
  const s = stats(times);

  const coldTimes: number[] = [];
  for (let i = 0; i < COLD_ITERS; i++) {
    const t0 = performance.now();
    layoutTableFrame(buildTable(rows, cols, `cold${i}_`)); // unique cell text each time — guaranteed prepare-cache miss
    coldTimes.push(performance.now() - t0);
  }
  const cold = Math.min(...coldTimes);

  const cellCount = (rows + 1) * (cols + 1);
  tableRows.push([`${rows}x${cols} (${cellCount})`, fmt(s.total), fmt(s.min), fmt(s.median), fmt(s.max), fmt(cold), `${(cold / s.min).toFixed(1)}x`]);
}
printTable(HEAD, tableRows);
