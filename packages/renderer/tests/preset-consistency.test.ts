/**
 * preset-consistency.test.ts — generic cross-preset invariants.
 *
 * Not a golden suite. For every cases/<group>/<case>/input.json it renders
 * each declared preset and asserts properties that must hold *regardless* of
 * SVG structure (flat <text> vs <tspan> groups vs per-glyph <tspan x="...">):
 *
 *   1. baseline set — the distinct set of text-element `y` values is identical
 *      across presets (catches script offsets that one path forgets, e.g. the
 *      glyph path once drew super/sub on the normal baseline).
 *   2. left edge — the minimum glyph x is identical across presets (catches
 *      alignment / column double-counting in one path only).
 *   3. highlight anchoring — every background <rect> starts at some real glyph
 *      x within the same render (catches the highlight-rect drift on
 *      centered / right-aligned / multi-column lines).
 *
 * Runs off the same corpus as cases.test.ts; `env: 'arial'` cases are skipped
 * for the same metric-instability reason.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerUnifont, registerArialVariants, registerFixtureFonts } from '../../core/tests/helpers.ts';
import { layoutTextFrame } from '@vyaz/core';
import type { TextFrame } from '@vyaz/core';
import { renderToSVG } from '../src/SVGRenderer.js';

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'cases');
const EPS = 0.5;

beforeAll(async () => {
  await registerUnifont();
  await registerArialVariants();
  await registerFixtureFonts();
});

function render(profile: string, frame: TextFrame, r: any): string {
  const result = layoutTextFrame(frame, { glyphAdvances: r?.preset === 'glyph', mode: r?.mode, shaping: r?.shaping });
  if (profile === 'frame-fit') {
    return renderToSVG(result, { debug: { frameBox: true, contentBox: true }, ...r } as any);
  }
  return renderToSVG(result.lines, r as any);
}

/** First numeric value of an `x="12"` or `x="12 24 36"` attribute. */
function firstX(xAttr: string): number {
  return parseFloat(xAttr.trim().split(/\s+/)[0]);
}

interface Parsed {
  /** distinct rounded `y` of every <text> element */
  baselines: number[];
  /** every glyph left edge: <text x> and each <tspan x> first value */
  xs: number[];
  /** left edge x of every non-debug background <rect> */
  bgRectXs: number[];
  /** does this render show any underline / strikethrough, however expressed */
  hasDecoration: boolean;
}

function parse(svg: string): Parsed {
  // strip the debug overlay comment tail — its rects are frame/paragraph boxes
  const body = svg.split('<!-- debug overlay -->')[0];

  const baselines = new Set<number>();
  const xs: number[] = [];
  for (const m of body.matchAll(/<text\b[^>]*\by="([-\d.]+)"[^>]*>/g)) {
    baselines.add(Math.round(parseFloat(m[1]) * 100) / 100);
  }
  for (const m of body.matchAll(/<text\b[^>]*\bx="([-\d.\s]+)"[^>]*>/g)) xs.push(firstX(m[1]));
  for (const m of body.matchAll(/<tspan\b[^>]*\bx="([-\d.\s]+)"[^>]*>/g)) xs.push(firstX(m[1]));

  const bgRectXs: number[] = [];
  for (const m of body.matchAll(/<rect\b[^>]*\bx="([-\d.]+)"[^>]*\bfill="(#[0-9A-Fa-f]+|rgb[^"]+)"[^>]*\/>/g)) {
    bgRectXs.push(parseFloat(m[1]));
  }

  // flat/expanded express it as `text-decoration`; glyph draws explicit <line>s.
  const hasDecoration = /text-decoration\s*[:=]\s*"?(underline|line-through)/.test(body) || /<line\b/.test(body);

  return { baselines: [...baselines].sort((a, b) => a - b), xs, bgRectXs, hasDecoration };
}

const near = (a: number, b: number) => Math.abs(a - b) <= EPS;

// ── discover cases (same walk as cases.test.ts) ────────────────────────
const found: { name: string; dir: string }[] = [];
for (const group of readdirSync(DIR)) {
  const gp = resolve(DIR, group);
  if (group.startsWith('_') || !statSync(gp).isDirectory()) continue;
  for (const c of readdirSync(gp)) {
    const cp = resolve(gp, c);
    if (statSync(cp).isDirectory() && existsSync(resolve(cp, 'input.json'))) {
      found.push({ name: `${group}/${c}`, dir: cp });
    }
  }
}

describe('cross-preset consistency', () => {
  for (const { name, dir } of found) {
    const input = JSON.parse(readFileSync(resolve(dir, 'input.json'), 'utf8'));
    const t = input.env === 'arial' ? test.skip : test;
    const profile = input.profile ?? 'raw';

    t(`${name} — presets agree on baselines, left edge, highlight anchoring, decoration presence`, () => {
      const all = Object.entries<any>(input.renders).map(([variant, r]) => ({
        variant,
        preset: r?.preset ?? variant,
        // variants that deliberately opt out of decoration geometry don't
        // participate in the decoration-parity check
        decoOptOut: r?.glyphDecorations === false,
        // shaped vs unshaped variants are different layouts — compare within,
        // not across (the SVG structure is what the suite checks, not the width model)
        shaping: !!r?.shaping,
        ...parse(render(profile, input.frame, r)),
      }));
      const byLayout = new Map<boolean, typeof all>();
      for (const v of all) (byLayout.get(v.shaping) ?? byLayout.set(v.shaping, []).get(v.shaping)!).push(v);

      for (const rendered of byLayout.values()) checkGroup(rendered);
    });

    function checkGroup(rendered: any[]): void {
      if (rendered.length < 2) return;

      const ref = rendered[0];
      const refMinX = ref.xs.length ? Math.min(...ref.xs) : null;

      for (const cur of rendered.slice(1)) {
        // 1. baseline set identical
        expect(
          `${cur.variant}: ${cur.baselines.join(',')}`,
        ).toBe(`${cur.variant}: ${ref.baselines.join(',')}`);

        // 2. left edge identical (when both renders emitted glyphs)
        if (refMinX !== null && cur.xs.length) {
          expect(near(Math.min(...cur.xs), refMinX)).toBe(true);
        }
      }

      // 3. every highlight rect is anchored to a real glyph x. Only the
      // tspan-based presets carry a per-span x; flat collapses "space + word"
      // into one <text x=…> so the post-space glyph position isn't in the DOM.
      for (const cur of rendered) {
        if (cur.preset === 'flat') continue;
        for (const rx of cur.bgRectXs) {
          const anchored = cur.xs.some((gx) => near(gx, rx));
          expect(anchored || `${cur.variant} rect x=${rx} not anchored`).toBe(true);
        }
      }

      // 4. underline / strikethrough presence agrees across presets — flat &
      // expanded via `text-decoration`, glyph via explicit <line> geometry.
      for (const cur of rendered.slice(1)) {
        if (cur.decoOptOut) continue;
        expect(`${cur.variant} decoration=${cur.hasDecoration}`).toBe(
          `${cur.variant} decoration=${ref.hasDecoration}`,
        );
      }
    }
  }
});
