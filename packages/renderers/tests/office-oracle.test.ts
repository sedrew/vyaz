/**
 * office-oracle.test.ts — `mode: 'office'` baselines against PowerPoint's own
 * SVG export of the same text box.
 *
 * Every office-cases/<case>/ with a `powerpoint.svg` (File ▸ Export ▸ SVG from
 * scripts/office-metrics/line-spacing.pptx, see office-cases/MIGRATION.md) is
 * laid out with `mode: 'office'` and each line's baseline compared with the
 * `<text transform="matrix(1 0 0 1 x y)">` origins PowerPoint wrote. Unlike the
 * goldens next to it, this pins vyaz to PowerPoint, not to its own last output.
 *
 * PowerPoint's SVG is in whole units of 1/330 in (72 / 330 pt each, ±0.11 pt);
 * every text box of the deck sits at y = 0.4 in = 132 units.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerUnifont, registerFixtureFonts } from '../../core/tests/helpers.ts';
import { layoutTextFrame } from '@vyaz/core';

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'office-cases');
const PT_PER_UNIT = 72 / 330;
const BOX_TOP_UNITS = 132;
/** Half a unit of PowerPoint's grid plus what is left of the line-box model (the old `(typo + win) / 2` baseline was 0.37 pt off). */
const TOLERANCE_PT = 0.15;

beforeAll(async () => {
  await registerUnifont();
  await registerFixtureFonts();
});

/** PowerPoint's baselines, pt from the box top, one per line (runs of one line share a y). */
function pptBaselines(svg: string): number[] {
  const ys = [...svg.matchAll(/<text[^>]*transform="matrix\(1 0 0 1 [-\d.]+ ([-\d.]+)\)"/g)].map((m) => +m[1]);
  return [...new Set(ys)].map((y) => (y - BOX_TOP_UNITS) * PT_PER_UNIT);
}

describe('office mode vs PowerPoint SVG export', () => {
  for (const name of readdirSync(DIR)) {
    const oracle = resolve(DIR, name, 'powerpoint.svg');
    if (!existsSync(oracle)) continue;
    test(`${name}: every baseline within ${TOLERANCE_PT} pt`, () => {
      const input = JSON.parse(readFileSync(resolve(DIR, name, 'input.json'), 'utf8'));
      const lines = layoutTextFrame(input.frame, { mode: 'office' }).lines;
      const ppt = pptBaselines(readFileSync(oracle, 'utf8'));
      expect(lines.length).toBe(ppt.length);
      const worst = Math.max(...lines.map((l, i) => Math.abs(l.y + l.baseline - ppt[i])));
      expect(worst).toBeLessThanOrEqual(TOLERANCE_PT);
    });
  }
});
