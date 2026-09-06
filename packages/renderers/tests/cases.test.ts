/**
 * cases.test.ts — golden corpus runner.
 *
 * Each cases/<group>/<case>/input.json declares { profile, frame, renders }.
 * For every render variant it renders SVG and compares to <variant>.svg.
 *
 *   bun test packages/renderers/tests/cases.test.ts          # verify
 *   UPDATE=1 bun test packages/renderers/tests/cases.test.ts # regenerate goldens
 *
 * Profiles:
 *   raw        — renderToSVG(lines, render) verbatim
 *   frame-fit  — recompute sizing/width/height from the fresh layout result
 *                (mirrors the old svg-text-frame.test.ts helper)
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerUnifont, registerArialVariants, registerFixtureFonts, makeParagraph, makeTextFrame } from '../../core/tests/helpers.ts';
import { layoutTextFrame } from '@vyaz/core';
import type { TextFrame } from '@vyaz/core';
import { renderToSVG } from '../src/SVGRenderer.js';

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'cases');
const UPDATE = process.env.UPDATE === '1';

beforeAll(async () => {
  await registerUnifont();
  await registerArialVariants();
  await registerFixtureFonts();
});

function renderCase(profile: string, frame: TextFrame, r: any): string {
  const result = layoutTextFrame(frame, { glyphAdvances: r?.preset === 'glyph', mode: r?.mode, shaping: r?.shaping });
  // frame-fit: let renderToSVG derive sizing/width/height from the result;
  // the runner only adds baseline debug boxes + render options.
  if (profile === 'frame-fit') {
    return renderToSVG(result, { debug: { frameBox: true, contentBox: true }, ...r } as any);
  }
  // raw: the case supplies explicit sizing ('content' + padding) — pass lines.
  return renderToSVG(result.lines, r as any);
}

// ── discover cases ──────────────────────────────────────────────────────
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

describe('cases', () => {
  for (const { name, dir } of found) {
    const input = JSON.parse(readFileSync(resolve(dir, 'input.json'), 'utf8'));
    // `env: 'arial'` cases render with the host's system Arial, whose metrics
    // vary by machine — skipped until the corpus is switched to a bundled font.
    const t = input.env === 'arial' ? test.skip : test;
    for (const [variant, r] of Object.entries<any>(input.renders)) {
      t(`${name} [${variant}]`, () => {
        const svg = renderCase(input.profile ?? 'raw', input.frame, r).trim();
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

// ── renderToSVG polymorphism (5g) ──────────────────────────────────────
describe('renderToSVG(result) vs renderToSVG(lines)', () => {
  test('result form derives frame size; equals explicit lines form', () => {
    const frame = makeTextFrame([makeParagraph('Hi there', { fontFamily: 'Unifont', fontSize: 16 })], { width: 300, height: 120 });
    const result = layoutTextFrame(frame);
    const viaResult = renderToSVG(result, { preset: 'flat' });
    const viaLines = renderToSVG(result.lines, {
      sizing: { horizontal: 'frame', vertical: 'frame' }, width: 300, height: 120, preset: 'flat',
    });
    expect(viaResult).toBe(viaLines);
  });
});

// ── missingGlyph: 'box' (glyph preset) ─────────────────────────────────
describe('missingGlyph', () => {
  // "AB → CD" in Roboto: the arrow (U+2192) is not in Roboto → .notdef.
  const frame = () => makeTextFrame([makeParagraph('AB → CD', { fontFamily: 'Roboto', fontSize: 40 })]);
  const glyphOpts = { preset: 'glyph' as const, sizing: 'content' as const, contentPadding: 4 };

  test("'keep' (default) passes the character through", () => {
    const svg = renderToSVG(layoutTextFrame(frame(), { glyphAdvances: true }).lines, glyphOpts);
    expect(svg).toContain('→');
    expect(svg).not.toContain('<rect'); // no debug boxes here
  });

  test("'box' drops the character and draws one hollow rect", () => {
    const result = layoutTextFrame(frame(), { glyphAdvances: true });
    const span = result.lines[0].spans.find((s) => s.type === 'text')!;
    expect(span.notdefRanges).toEqual([{ start: 3, end: 4 }]);

    const svg = renderToSVG(result.lines, { ...glyphOpts, missingGlyph: 'box' });
    expect(svg).not.toContain('→');
    const rects = [...svg.matchAll(/<rect [^>]*fill="none"[^>]*\/>/g)];
    expect(rects).toHaveLength(1);
    expect(rects[0][0]).toMatch(/stroke="#000000"/);
  });

  test("'box' keeps the slot — text after the missing glyph does not move", () => {
    const result = layoutTextFrame(frame(), { glyphAdvances: true });
    const keep = renderToSVG(result.lines, glyphOpts);
    const box = renderToSVG(result.lines, { ...glyphOpts, missingGlyph: 'box' });
    // the per-glyph x list is identical; only the tspan text and the extra rect differ
    const xList = (s: string) => s.match(/<tspan x="([^"]+)"/)![1];
    expect(xList(box)).toBe(xList(keep));
  });

  test("'box' is a no-op without notdefRanges (all-covered text)", () => {
    const result = layoutTextFrame(
      makeTextFrame([makeParagraph('plain', { fontFamily: 'Roboto', fontSize: 40 })]),
      { glyphAdvances: true },
    );
    const box = renderToSVG(result.lines, { ...glyphOpts, missingGlyph: 'box' });
    expect(box).not.toContain('<rect');
    expect(box).toContain('>plain<');
  });
});
