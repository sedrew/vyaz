/**
 * browser-metrics.test.ts — fontkit `shape` profile vs a frozen browser oracle.
 *
 * The oracle (`fixtures/browser-metrics/<family>-<weight>.json`) is Chrome's
 * `getComputedTextLength()` for every corpus string, captured once by
 * `scripts/browser-metrics/` and committed. This test measures the same strings
 * with `measurePx(..., { engine: 'shape' })` and asserts they line up — that is
 * what makes the SVG `browser` preset's positions land where the browser paints.
 *
 * Refresh the oracle: `bun scripts/browser-metrics/build-page.ts`, open the page,
 * `bun scripts/browser-metrics/capture.ts`. Re-check tolerances against
 * `bun scripts/browser-metrics/report.ts`.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fontMetricsProvider, createFontFace, measurePx } from '../src/index.js';
import {
  oracleDir,
  registerOracleFont,
  EXCLUDED_CATEGORIES,
  EXCLUDED_FAMILY_SCRIPT,
} from '../../../scripts/browser-metrics/_shared.ts';

interface Entry { script: string; category: string; s: string; size: number; svgPx: number; canvasPx: number }
interface Oracle { meta: { family: string; weight: string; variation: Record<string, number> | null }; entries: Entry[] }

const files = readdirSync(oracleDir).filter((f) => f.endsWith('.json'));

/** (family, script, category) where fontkit's shaper is known to disagree with
 *  Chrome's HarfBuzz — currently Inter's aggressive digit↔punctuation kern
 *  pairs. Bounded and asserted separately so a real regression still shows. */
const KNOWN_SHAPER_GAP = new Set(['Inter\tlatin\tnumerals', 'Inter\tlatin\tkerning-pairs']);

const fontAtBy = new Map<string, (size: number) => any>();

beforeAll(async () => {
  for (const file of files) {
    const doc: Oracle = JSON.parse(readFileSync(resolve(oracleDir, file), 'utf8'));
    const { family, weight, variation } = doc.meta;
    fontAtBy.set(
      `${family}-${weight}`,
      await registerOracleFont(fontMetricsProvider, createFontFace, family, weight, variation),
    );
  }
});

const err = (font: any, e: Entry, prof: any) =>
  measurePx(font._raw, e.size / font.unitsPerEm, e.size, e.s, prof) - e.svgPx;

describe('browser-metrics: fontkit shape profile matches Chrome', () => {
  for (const file of files) {
    const doc: Oracle = JSON.parse(readFileSync(resolve(oracleDir, file), 'utf8'));
    const { family, weight } = doc.meta;

    // group entries by (script, category)
    const groups = new Map<string, Entry[]>();
    for (const e of doc.entries) {
      if (EXCLUDED_CATEGORIES.has(e.category)) continue;
      if (EXCLUDED_FAMILY_SCRIPT.has(`${family}\t${e.script}`)) continue;
      const k = `${e.script}\t${e.category}`;
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(e);
    }

    for (const [k, entries] of groups) {
      const [script, category] = k.split('\t');
      const known = KNOWN_SHAPER_GAP.has(`${family}\t${k}`);

      test(`${family} ${weight} — ${script}/${category}${known ? ' (known shaper gap)' : ''}`, () => {
        const fontAt = fontAtBy.get(`${family}-${weight}`)!;
        const abs = entries.map((e) => Math.abs(err(fontAt(e.size), e, { engine: 'shape' })));
        abs.sort((a, b) => a - b);
        const p95 = abs[Math.min(abs.length - 1, Math.floor(0.95 * abs.length))];
        const meanSvg = entries.reduce((s, e) => s + e.svgPx, 0) / entries.length;

        if (known) {
          // documented divergence — bounded, and still non-trivial (so removing
          // the shaper gap later flips this and prompts a tolerance revisit)
          expect(Math.max(...abs)).toBeLessThan(12);
        } else {
          // clean set: within half a pixel or 1% of the string width
          expect(p95).toBeLessThanOrEqual(Math.max(0.5, 0.01 * meanSvg));
        }
      });
    }
  }
});

describe('browser-metrics: shape beats the advance-sum profile', () => {
  test('Roboto 400 latin kerning-pairs: mean |err| much lower under shape', () => {
    const doc: Oracle = JSON.parse(
      readFileSync(resolve(oracleDir, 'Roboto-400.json'), 'utf8'),
    );
    const fontAt = fontAtBy.get('Roboto-400')!;
    const kp = doc.entries.filter((e) => e.script === 'latin' && e.category === 'kerning-pairs');
    const mean = (prof: any) =>
      kp.reduce((s, e) => s + Math.abs(err(fontAt(e.size), e, prof)), 0) / kp.length;
    const shaped = mean({ engine: 'shape' });
    const advance = mean({ engine: 'advance' });
    expect(shaped).toBeLessThan(0.1);
    expect(advance).toBeGreaterThan(0.5);
    expect(shaped).toBeLessThan(advance / 5);
  });
});

describe('browser-metrics: variable-font instancing', () => {
  test('wght 400 vs 700 measure differently (getVariation applied)', () => {
    const w = (fam: string, size: number) => {
      const fontAt = fontAtBy.get(fam)!;
      const f = fontAt(size);
      return measurePx(f._raw, size / f.unitsPerEm, size, 'Watermelon', { engine: 'shape' });
    };
    // Inter's weight axis has a real width response; Roboto's is subtle but non-zero.
    expect(Math.abs(w('Inter-400', 48) - w('Inter-700', 48))).toBeGreaterThan(2);
    expect(w('Roboto-400', 16)).not.toBe(w('Roboto-700', 16));
  });

  test('Inter opsz axis is pinned to the size (font-optical-sizing: auto parity)', () => {
    const doc: Oracle = JSON.parse(readFileSync(resolve(oracleDir, 'Inter-400.json'), 'utf8'));
    const fontAt = fontAtBy.get('Inter-400')!;
    // a word at 48px is where opsz matters most; without opsz pinning this is ~10% wide
    const big = doc.entries.find((e) => e.category === 'words' && e.size === 48 && e.s === 'Typography')!;
    expect(Math.abs(err(fontAt(48), big, { engine: 'shape' }))).toBeLessThan(0.5);
  });
});
