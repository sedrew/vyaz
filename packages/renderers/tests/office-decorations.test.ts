/**
 * office-decorations.test.ts — `mode: 'office'` underline / strikethrough
 * come from the layout (`Line.decorations`, PowerPoint's model measured in
 * scripts/office-metrics/TEXT-FEATURES-RESULTS.md §5) and every SVG preset
 * paints exactly those rules — no per-span `text-decoration`, no `+2px / 1px`
 * glyph-preset line.
 *
 * Roboto: post underlinePosition −150, underlineThickness 100; OS/2 strikeout
 * 512 / 102 (per 2048 em).
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontMetricsProvider, layoutTextFrame } from '@vyaz/core';
import { renderToSVG } from '../src/index.ts';
import type { TextFrame, TextRun } from '../../core/src/types/Document.js';

beforeAll(async () => {
  const buf = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../core/tests/fixtures/Roboto-VariableFont_wdth,wght.ttf'));
  await fontMetricsProvider.registerFont('Roboto', { weight: 'normal' }, buf);
});

const em = (units: number, size: number) => (units / 2048) * size;

function render(children: Partial<TextRun>[], preset: 'browser' | 'flat' | 'glyph' | 'preserve', width = 700) {
  const frame: TextFrame = {
    width, wrap: true,
    paragraphs: [{ style: { alignment: 'left', lineHeight: 1, spaceBefore: 0, spaceAfter: 0 }, children: children.map((c) => ({ type: 'text', fontFamily: 'Roboto', ...c }) as TextRun) }],
  };
  const result = layoutTextFrame(frame, { mode: 'office', glyphAdvances: preset === 'glyph' });
  const svg = renderToSVG(result, { preset, sizing: { horizontal: 'frame', vertical: 'content' }, width });
  const rules = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="[\d.]+" stroke="[^"]+" stroke-width="([\d.]+)"/g)]
    .map((m) => ({ x1: +m[1], x2: +m[3], top: +m[2] - +m[4] / 2, t: +m[4] }));
  return { svg, rules, result };
}

describe('office decorations: every preset paints the layout rules', () => {
  for (const preset of ['flat', 'browser', 'preserve', 'glyph'] as const) {
    test(`${preset}: underline at the font's position and thickness, no text-decoration`, () => {
      const { svg, rules, result } = render([{ text: 'Hxg 144', fontSize: 144, underline: true }], preset);
      const line = result.lines[0];
      expect(svg).not.toContain('text-decoration');
      expect(rules).toHaveLength(1);
      expect(rules[0].top - (line.y + line.baseline)).toBeCloseTo(em(150, 144), 1);
      expect(rules[0].t).toBeCloseTo(em(100, 144), 1);
    });
  }

  test('strikethrough per run, each at its own size', () => {
    const { rules, result } = render([{ text: 'B', fontSize: 100, strikethrough: true }, { text: ' small', fontSize: 10, strikethrough: true }], 'glyph');
    const baseline = result.lines[0].y + result.lines[0].baseline;
    expect(rules.map((r) => Math.round((r.top - baseline) * 10) / 10)).toEqual([-Math.round(em(512, 100) * 10) / 10, -Math.round(em(512, 10) * 10) / 10]);
  });

  test('the rule stops at the last glyph of a wrapped line', () => {
    const { rules, result } = render([{ text: 'underlined words that wrap here', fontSize: 16, underline: true }], 'glyph', 120);
    const first = result.lines[0];
    const lastGlyph = first.spans.filter((s) => s.type === 'text').at(-1)!;
    expect(rules[0].x2).toBeCloseTo(first.x + lastGlyph.x + lastGlyph.width - first.spans[0].x, 1);
  });
});
