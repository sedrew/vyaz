/**
 * cases.test.ts — golden corpus runner.
 *
 * Each cases/<group>/<case>/input.json declares { profile, frame, renders }.
 * For every render variant it renders SVG and compares to <variant>.svg.
 *
 *   bun test packages/renderer/tests/cases.test.ts          # verify
 *   UPDATE=1 bun test packages/renderer/tests/cases.test.ts # regenerate goldens
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
