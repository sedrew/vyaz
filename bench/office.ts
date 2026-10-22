/**
 * office.ts — `mode: 'office'` throughput across many small frames (a deck:
 * every text box is its own `layoutTextFrame()` call, so the measure profile
 * flips in and out around each one).
 *
 *   bun run bench/office.ts
 *   OFFICE_FRAMES=2000 bun run bench/office.ts
 *
 * Reports, for N frames drawn from a shared vocabulary:
 *   cold  — unique paragraph text per pass (prepare-cache miss; word widths repeat)
 *   warm  — identical frames again (prepare-cache hit; positioning still measures)
 *
 * Roboto and Great Vibes come from the test fixtures. Both are GPOS-only, so the
 * office profile shapes them (fontkit `layout()`) with kerning off — the shaping
 * cost, which is what this measures, is the same as for a kerned font.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fontMetricsProvider } from '../packages/core/src/measure/FontMetricsProvider.js';
import { layoutTextFrame } from '../packages/core/src/layout/TextFrameLayoutEngine.js';
import type { TextFrame, Paragraph, TextRun } from '../packages/core/src/types/Document.js';

const FIX = resolve(import.meta.dir, '../packages/core/tests/fixtures');
await fontMetricsProvider.registerFont('Roboto', { weight: 'normal', style: 'normal' }, readFileSync(`${FIX}/Roboto-VariableFont_wdth,wght.ttf`));
await fontMetricsProvider.registerFont('Great Vibes', { weight: 'normal', style: 'normal' }, readFileSync(`${FIX}/GreatVibes-Regular.ttf`));

const WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua Ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.split(' ');
const FRAMES = Number(process.env.OFFICE_FRAMES ?? 1000);
const RUNS_PER_FRAME = 12;

function makeFrame(f: number, salt: string): TextFrame {
  const children: TextRun[] = [];
  for (let i = 0; i < RUNS_PER_FRAME; i++) {
    const g = f * 7 + i;
    children.push({
      type: 'text',
      text: (i === 0 ? salt : '') + WORDS[g % WORDS.length] + ' ' + WORDS[(g * 3 + 1) % WORDS.length] + ' ',
      fontFamily: g % 4 === 0 ? 'Great Vibes' : 'Roboto',
      fontSize: g % 5 === 0 ? 24 : 11,
      color: '#000',
    } as TextRun);
  }
  const para: Paragraph = {
    style: { alignment: 'left', lineHeight: 1.2, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal' },
    children,
  };
  return { width: 320, wrap: true, paragraphs: [para] };
}

function pass(salt: string): number {
  const frames = Array.from({ length: FRAMES }, (_, f) => makeFrame(f, salt));
  const t = performance.now();
  for (const fr of frames) layoutTextFrame(fr, { mode: 'office' });
  return performance.now() - t;
}
function warmPass(frames: TextFrame[]): number {
  const t = performance.now();
  for (const fr of frames) layoutTextFrame(fr, { mode: 'office' });
  return performance.now() - t;
}

pass('jit_');
const cold = Math.min(...[0, 1, 2, 3, 4].map((i) => pass(`c${i}_`)));
const warmFrames = Array.from({ length: FRAMES }, (_, f) => makeFrame(f, 'warm_'));
warmPass(warmFrames);
const warm = Math.min(...[0, 1, 2, 3, 4].map(() => warmPass(warmFrames)));

const per = (ms: number) => `${((ms * 1000) / FRAMES).toFixed(1)}µs/frame`;
console.log(`\nvyaz office-mode throughput   (${FRAMES} frames × ${RUNS_PER_FRAME} runs, Roboto + Great Vibes, width 320)\n`);
console.log(`  cold  ${cold.toFixed(1)}ms  (${per(cold)})`);
console.log(`  warm  ${warm.toFixed(1)}ms  (${per(warm)})\n`);
