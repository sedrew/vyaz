/**
 * decoration-box.test.ts — the `browser` preset's decorating-box rule.
 *
 * Chrome draws a decoration with the font of the element that set it, not of
 * each nested run (`TextRun.decorationFontSize`). Numbers below are headless
 * Chromium's, Roboto: `<u>` at 16px around a 48px span → ONE 1px underline
 * whose top is 1px below the baseline; `<s>` at 16px → 1px lines 36px above
 * the baseline over the 48px text and 6px above it over the 16px text.
 * Runs in a single size keep native SVG `text-decoration`.
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

const W = 600;
function render(kind: 'underline' | 'strikethrough', sizes: number[], box: number | undefined, preset: 'browser' | 'flat' = 'browser') {
  const children: TextRun[] = sizes.map((fontSize, i) => ({
    type: 'text', text: i === 0 ? 'ab ' : 'Hxgyj', fontFamily: 'Roboto', fontSize, [kind]: true,
    ...(box !== undefined ? { decorationFontSize: { [kind]: box } } : {}),
  }));
  const frame: TextFrame = { width: W, wrap: true, paragraphs: [{ style: { alignment: 'left', lineHeight: 1.4, spaceBefore: 0, spaceAfter: 0 }, children }] };
  const result = layoutTextFrame(frame, { shaping: true });
  const svg = renderToSVG(result, { preset, sizing: { horizontal: 'frame', vertical: 'content' }, width: W });
  const line = result.lines[0];
  const rules = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="[\d.]+" stroke="[^"]+" stroke-width="([\d.]+)"/g)]
    .map((m) => ({ x1: +m[1], y: +m[2], x2: +m[3], t: +m[4] }));
  return { svg, rules, baseline: line.y + line.baseline, line };
}

describe('decorating box (browser preset)', () => {
  test('underline: one thin line from the 16px box under the 48px text too', () => {
    const { svg, rules, baseline, line } = render('underline', [16, 48], 16);
    expect(svg).not.toContain('text-decoration');
    expect(rules).toHaveLength(1);
    expect(rules[0].t).toBe(1);
    expect(rules[0].y).toBeCloseTo(baseline + 1 + 0.5, 6); // top 1px below the baseline
    expect(rules[0].x2 - rules[0].x1).toBeCloseTo(line.width, 1);
  });

  test('line-through: per fragment, 1px, at Chrome\'s heights', () => {
    const { rules, baseline } = render('strikethrough', [16, 48], 16);
    const tops = rules.map((r) => Math.round(r.y - r.t / 2 - baseline)).sort((a, b) => a - b);
    expect(rules.every((r) => r.t === 1)).toBe(true);
    expect(tops).toEqual([-36, -6]);
  });

  test('a single-size run keeps native text-decoration', () => {
    const { svg, rules } = render('underline', [24, 24], 24);
    expect(svg).toContain('text-decoration="underline"');
    expect(rules).toHaveLength(0);
  });

  test('without decorationFontSize every run is its own box (unchanged output)', () => {
    const { svg, rules } = render('underline', [16, 48], undefined);
    expect(svg).toContain('text-decoration="underline"');
    expect(rules).toHaveLength(0);
  });

  test('other presets keep native text-decoration', () => {
    const { svg, rules } = render('underline', [16, 48], 16, 'flat');
    expect(svg).toContain('text-decoration="underline"');
    expect(rules).toHaveLength(0);
  });
});
