/**
 * browser-line-box.test.ts — `mode: 'browser'` line box vs a frozen Chrome oracle.
 *
 * `fixtures/browser-line-box/line-box.json` is headless Chromium's own geometry
 * for one text line (block height, baseline, three-line height) over the
 * fixture fonts × 17 sizes × 6 line-heights, plus mixed-size lines. vyaz lays
 * the same runs out and must land on the same numbers — `Line.height` /
 * `Line.baseline` carry 2 dp, hence the 0.006 tolerance.
 *
 * Refresh the oracle: `bun scripts/browser-metrics/capture-line-box.ts`.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { layoutTextFrame } from '@vyaz/core';
import { registerUnifont, registerFixtureFonts, makeTextFrame } from './helpers.ts';
import type { Paragraph } from '../src/types/Document.js';

interface Measured { lineHeight: number; height: number; baseline: number; height3: number }
interface Single extends Measured { family: string; size: number }
interface Mixed extends Measured { family: string; sizes: number[] }

const ORACLE = JSON.parse(readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/browser-line-box/line-box.json'), 'utf8',
)) as { meta: { text: string }; single: Single[]; multi: Mixed[] };
const TEXT = ORACLE.meta.text;
const EPS = 0.006;

beforeAll(async () => {
  await registerUnifont();
  await registerFixtureFonts();
});

function layout(family: string, sizes: number[], lineHeight: number, lines = 1) {
  const para = (): Paragraph => ({
    children: sizes.map((fontSize) => ({ type: 'text' as const, text: TEXT, fontFamily: family, fontSize })),
    style: { alignment: 'left', lineHeight, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal' },
  });
  return layoutTextFrame(makeTextFrame(Array.from({ length: lines }, para), { width: 10_000 }), { mode: 'browser' });
}

function check(family: string, sizes: number[], o: Measured) {
  const one = layout(family, sizes, o.lineHeight);
  expect(one.lines).toHaveLength(1);
  expect(Math.abs(one.lines[0].height - o.height)).toBeLessThan(EPS);
  expect(Math.abs(one.lines[0].baseline - o.baseline)).toBeLessThan(EPS);
  // Pitch: the third line starts two line boxes down (no drift). The total
  // height sums two independently 2 dp-rounded values, hence 2 × EPS.
  const three = layout(family, sizes, o.lineHeight, 3);
  expect(Math.abs(three.lines[2].y - (o.height3 * 2) / 3)).toBeLessThan(EPS);
  expect(Math.abs(three.content.height - o.height3)).toBeLessThan(2 * EPS);
}

describe('browser line box = Chrome (single run)', () => {
  for (const o of ORACLE.single) {
    test(`${o.family} ${o.size}px / ${o.lineHeight}`, () => check(o.family, [o.size], o));
  }
});

describe('browser line box = Chrome (mixed sizes on one line)', () => {
  for (const o of ORACLE.multi) {
    test(`${o.family} [${o.sizes.join(', ')}]px / ${o.lineHeight}`, () => check(o.family, o.sizes, o));
  }
});
