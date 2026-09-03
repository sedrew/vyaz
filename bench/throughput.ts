/**
 * throughput.ts — layout + render throughput across run counts.
 *
 *   bun run bench/throughput.ts
 *   BENCH_MAX=100000 bun run bench/throughput.ts     # cap the largest size
 *   BENCH_SIZES=100,5000,50000 bun run bench/throughput.ts
 *
 * Measures, per run count N:
 *   build    — time to allocate the input TextFrame (N runs, ~50 runs/paragraph)
 *   layout   — layoutTextFrame(), cold (prepare-cache miss) and warm (cache hit)
 *   render   — renderToSVG(result.lines, { preset: 'flat' })
 *   heap     — process heapUsed after one cold layout (working set)
 *
 * Unifont is registered from the test fixture so numbers are machine-stable
 * (no system-font lookup).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fontMetricsProvider } from '../packages/core/src/measure/FontMetricsProvider.js';
import { layoutTextFrame } from '../packages/core/src/layout/TextFrameLayoutEngine.js';
import { renderToSVG } from '../packages/renderer/src/SVGRenderer.js';
import type { TextFrame, Paragraph, TextRun } from '../packages/core/src/types/Document.js';

// ── setup ───────────────────────────────────────────────────────────────
const FONT = resolve(import.meta.dir, '../packages/core/tests/fixtures/unifont-17.0.05.otf');
await fontMetricsProvider.registerFont('Unifont', { weight: 'normal', style: 'normal' }, readFileSync(FONT));
await fontMetricsProvider.registerFont('Unifont', { weight: 'bold', style: 'normal' }, readFileSync(FONT));
await fontMetricsProvider.registerFont('Unifont', { weight: 'normal', style: 'italic' }, readFileSync(FONT));

const WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore'.split(' ');
const RUNS_PER_PARA = 50;

function makeFrame(nRuns: number, salt = ''): TextFrame {
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
    paras.push({
      style: { alignment: 'left', lineHeight: 1.3, spaceBefore: 0, spaceAfter: 6, whiteSpace: 'normal' },
      children,
    });
    made += count;
  }
  return { width: 800, wrap: true, paragraphs: paras };
}

// ── timing helpers ──────────────────────────────────────────────────────
const gc = () => { try { (globalThis as any).Bun?.gc?.(true); } catch {} };

function bench(label: string, iters: number, fn: (i: number) => void): { min: number; median: number } {
  fn(0); // warm the JIT
  const t: number[] = [];
  for (let i = 0; i < iters; i++) {
    const a = performance.now();
    fn(i + 1);
    t.push(performance.now() - a);
  }
  t.sort((x, y) => x - y);
  return { min: t[0], median: t[(t.length / 2) | 0] };
}

function itersFor(n: number): number {
  if (n <= 100) return 200;
  if (n <= 1_000) return 80;
  if (n <= 10_000) return 20;
  if (n <= 100_000) return 6;
  return 2;
}

// ── run ─────────────────────────────────────────────────────────────────
const DEFAULT_SIZES = [100, 1_000, 10_000, 100_000, 1_000_000];
const cap = process.env.BENCH_MAX ? Number(process.env.BENCH_MAX) : Infinity;
const sizes = (process.env.BENCH_SIZES
  ? process.env.BENCH_SIZES.split(',').map(Number)
  : DEFAULT_SIZES
).filter(n => n <= cap);

const fmt = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(2)}ms`;
const rate = (n: number, ms: number) => `${Math.round(n / (ms / 1000)).toLocaleString()}/s`;
const perRun = (n: number, ms: number) => `${((ms * 1000) / n).toFixed(2)}µs`;

console.log(`\nvyaz layout+render throughput   (Unifont, ${RUNS_PER_PARA} runs/paragraph, width 800, wrap)\n`);
const rows: string[][] = [];

for (const n of sizes) {
  const iters = itersFor(n);

  const b = bench('build', iters, () => { makeFrame(n); });

  gc();
  const heap0 = process.memoryUsage().heapUsed;
  let lastLines: any;
  const cold = bench('layout cold', iters, (i) => {
    const f = makeFrame(n, `s${i}_`);            // unique text → prepare-cache miss
    lastLines = layoutTextFrame(f).lines;
  });
  const heapMB = (process.memoryUsage().heapUsed - heap0) / 1e6;

  const warmFrame = makeFrame(n, 'warm_');
  layoutTextFrame(warmFrame);                     // prime the cache
  const warm = bench('layout warm', iters, () => { layoutTextFrame(warmFrame); });

  const rlines = layoutTextFrame(makeFrame(n, 'r_')).lines;
  const render = bench('render', Math.max(2, iters / 2 | 0), () => {
    renderToSVG(rlines, { preset: 'flat', sizing: 'content', contentPadding: 0 } as any);
  });

  rows.push([
    n.toLocaleString(),
    fmt(b.min),
    `${fmt(cold.min)}  (${rate(n, cold.min)}, ${perRun(n, cold.min)})`,
    `${fmt(warm.min)}  (${rate(n, warm.min)})`,
    `${fmt(render.min)}  (${Math.round(lastLines.length / (render.min / 1000)).toLocaleString()} lines/s)`,
    `${heapMB.toFixed(1)} MB`,
  ]);
  console.log(`  ${n.toLocaleString().padStart(9)} runs  ·  cold ${fmt(cold.min).padStart(8)}  ·  warm ${fmt(warm.min).padStart(8)}  ·  render ${fmt(render.min).padStart(8)}  ·  heap ${heapMB.toFixed(0)} MB`);
}

// ── table ───────────────────────────────────────────────────────────────
const head = ['runs', 'build', 'layout cold (min)', 'layout warm (min)', 'render flat (min)', 'heap Δ'];
const widths = head.map((h, c) => Math.max(h.length, ...rows.map(r => r[c].length)));
const line = (r: string[]) => '  ' + r.map((c, i) => c.padEnd(widths[i])).join('  │  ');
console.log('\n' + line(head));
console.log('  ' + widths.map(w => '─'.repeat(w)).join('──┼──'));
for (const r of rows) console.log(line(r));
console.log();
