/**
 * office-cases.test.ts — golden corpus runner for `mode: 'office'` line-box.
 *
 * Sibling of cases.test.ts / table-cases.test.ts (same golden-corpus
 * philosophy — the render presets are *variants* of one scenario, not
 * separate case folders — but its own directory: office-cases/<case>/input.json).
 * Kept out of tests/cases/ on purpose: every case here is laid out with
 * `mode: 'office'` forced by the runner, so the goldens capture PowerPoint /
 * DrawingML line-box behaviour, not the CSS/browser one that tests/cases/ and
 * the docs Cases explorer assume.
 *
 * Why this corpus exists: in `mode: 'office'` the paragraph line-spacing
 * multiplier (`style.lineHeight` — DrawingML `<a:lnSpc><a:spcPct>`) is applied
 * differently from browser mode (PositioningEngine currently ignores it and
 * uses `maxLineHeightBase` verbatim). These cases pin the current output for
 * line spacing 1.0 / 1.5 / 2.0 — separately and stacked in one frame — so any
 * change to the office line-height formula shows up as a reviewable golden diff.
 * Oracle data comes from `scripts/office-metrics/` (see gen-line-spacing.py).
 *
 * Case shape: { frame, renders, _comment? } — `frame` is a raw TextFrame,
 * `renders` maps a variant name to renderToSVG options (frame-fit profile:
 * size is derived from the layout result so a line-height change moves the
 * frame box). Fonts must be explicit on every run (Roboto here).
 *
 *   bun test packages/renderers/tests/office-cases.test.ts          # verify
 *   UPDATE=1 bun test packages/renderers/tests/office-cases.test.ts # regenerate goldens
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerUnifont, registerFixtureFonts } from '../../core/tests/helpers.ts';
import { layoutTextFrame } from '@vyaz/core';
import type { TextFrame } from '@vyaz/core';
import { renderToSVG } from '../src/SVGRenderer.js';

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'office-cases');
const UPDATE = process.env.UPDATE === '1';

beforeAll(async () => {
  await registerUnifont();
  await registerFixtureFonts();
});

/** Lay out with office mode forced, then let renderToSVG derive the frame size. */
function renderCase(frame: TextFrame, r: any): string {
  const result = layoutTextFrame(frame, {
    mode: 'office',
    glyphAdvances: r?.preset === 'glyph',
    shaping: r?.shaping,
  });
  return renderToSVG(result, { debug: { frameBox: true, contentBox: true }, ...r } as any);
}

// ── discover cases ──────────────────────────────────────────────────────
const found: { name: string; dir: string }[] = [];
for (const c of readdirSync(DIR)) {
  const cp = resolve(DIR, c);
  if (c.startsWith('_') || !statSync(cp).isDirectory()) continue;
  if (existsSync(resolve(cp, 'input.json'))) found.push({ name: c, dir: cp });
}

describe('office cases', () => {
  for (const { name, dir } of found) {
    const input = JSON.parse(readFileSync(resolve(dir, 'input.json'), 'utf8'));
    for (const [variant, r] of Object.entries<any>(input.renders)) {
      test(`${name} [${variant}]`, () => {
        const svg = renderCase(input.frame, r).trim();
        const snap = resolve(dir, `${variant}.svg`);
        if (UPDATE || !existsSync(snap)) {
          writeFileSync(snap, svg + '\n');
          return;
        }
        expect(svg).toBe(readFileSync(snap, 'utf8').trim());
      });
    }
  }
});
