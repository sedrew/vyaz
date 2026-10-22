/**
 * paragraph-indent.test.ts — every line wraps inside the indents it is
 * placed with: `leftIndent`, `indent` (first line), `rightIndent`, the list
 * marker zone (outside), an inside marker, an office marker wider than its
 * zone. Line breaking used to take the full box width while positioning
 * moved the lines in, so indented text ran past the box (both modes).
 * PowerPoint's own numbers: office-text-features.test.ts (a-center-indent).
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import type { Paragraph, ParagraphStyle } from '../src/types/Document.js';
import type { Line } from '../src/types/LayoutTypes.js';
import { registerUnifont } from './helpers.ts';
import { layoutTextFrame } from '@vyaz/core';

beforeAll(async () => {
  await registerUnifont();
});

const TEXT = 'The quick brown fox jumps over the lazy dog while a frame measures every line box and decides where each word wraps inside the given rectangle.';
const WIDTH = 240;

const para = (style: Partial<ParagraphStyle>): Paragraph => ({
  style: { alignment: 'left', lineHeight: 1, spaceBefore: 0, spaceAfter: 0, ...style },
  children: [{ type: 'text', text: TEXT, fontFamily: 'Unifont', fontSize: 16 }],
}) as Paragraph;

/** Left / right edge of the line's text (span x is frame-absolute), without trailing spaces and the marker. */
const inkEdges = (l: Line) => {
  const ink = l.spans.filter((s) => s.type === 'text' && !s.trailing);
  return { left: Math.min(...ink.map((s) => s.x)), right: Math.max(...ink.map((s) => s.x + s.width)) };
};

const CASES: [string, Partial<ParagraphStyle>, number, number][] = [
  // name, style, first-line left edge, other lines' left edge
  ['leftIndent', { leftIndent: 40 }, 40, 40],
  ['indent', { indent: 30 }, 30, 0],
  ['hanging indent', { leftIndent: 40, indent: -20 }, 20, 40],
  ['leftIndent + indent + rightIndent', { leftIndent: 40, indent: 20, rightIndent: 30 }, 60, 40],
  ['list, outside marker', { listStyle: { type: 'bullet', bulletIndent: 40 } }, 40, 40],
  ['list + leftIndent', { leftIndent: 20, listStyle: { type: 'number', bulletIndent: 30 } }, 50, 50],
];

for (const mode of ['browser', 'office'] as const) {
  describe(`lines wrap inside their indents (${mode})`, () => {
    for (const [name, style, first, rest] of CASES) {
      test(name, () => {
        const right = WIDTH - (style.rightIndent ?? 0);
        const lines = layoutTextFrame({ width: WIDTH, wrap: true, paragraphs: [para(style)] }, { mode }).lines;
        expect(lines.length).toBeGreaterThan(2);
        lines.forEach((l, i) => {
          const e = inkEdges(l);
          expect(e.left).toBeCloseTo(i === 0 ? first : rest, 1);
          expect(e.right).toBeLessThanOrEqual(right + 0.01);
        });
      });

      test(`${name}, centred: each line centred between its own indents`, () => {
        const right = WIDTH - (style.rightIndent ?? 0);
        const lines = layoutTextFrame({ width: WIDTH, wrap: true, paragraphs: [para({ ...style, alignment: 'center' })] }, { mode }).lines;
        lines.forEach((l, i) => {
          const e = inkEdges(l);
          const left = i === 0 ? first : rest;
          expect(e.left).toBeGreaterThanOrEqual(left - 0.01);
          expect(e.right).toBeLessThanOrEqual(right + 0.01);
          expect((e.left - left) - (right - e.right)).toBeCloseTo(0, 0);
        });
      });
    }

    test('inside marker: the first line leaves room for the marker', () => {
      const lines = layoutTextFrame({ width: WIDTH, wrap: true, paragraphs: [para({ listStyle: { type: 'number', position: 'inside' } })] }, { mode }).lines;
      for (const l of lines) expect(inkEdges(l).right).toBeLessThanOrEqual(WIDTH + 0.01);
    });

    test('the first line is narrower by `indent`, so it breaks earlier', () => {
      const plain = layoutTextFrame({ width: WIDTH, wrap: true, paragraphs: [para({})] }, { mode }).lines[0];
      const indented = layoutTextFrame({ width: WIDTH, wrap: true, paragraphs: [para({ indent: 80 })] }, { mode }).lines[0];
      expect(indented.endIndex).toBeLessThan(plain.endIndex);
    });
  });
}

test('office: a number wider than its zone narrows the first line by the overflow', () => {
  const lines = layoutTextFrame({
    width: WIDTH, wrap: true,
    paragraphs: [para({ listStyle: { type: 'number', bulletIndent: 4, startNumber: 100 } })],
  }, { mode: 'office' }).lines;
  for (const l of lines) expect(inkEdges(l).right).toBeLessThanOrEqual(WIDTH + 0.01);
});
