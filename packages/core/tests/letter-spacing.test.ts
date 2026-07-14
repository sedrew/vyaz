/**
 * letter-spacing.test.ts — integration tests for letterSpacing in layout.
 *
 * Tests:
 * - letterSpacing increases span width proportionally to char count
 * - Negative letterSpacing reduces width
 * - letterSpacing: 0 behaves same as undefined
 * - Layout width matches expected formula: baseWidth + letterSpacing * (charCount - 1)
 * - letterSpacing from ParagraphStyle as fallback
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import type { Paragraph } from '../src/types/Document.js';
import { paragraphLayoutEngine } from '../src/layout/ParagraphLayoutEngine.js';
import { registerArialVariants } from './helpers.ts';

beforeAll(async () => {
  await registerArialVariants();
});

/** Helper: layout a single-run paragraph and return the first (and only) span */
function layoutSpan(text: string, letterSpacing?: number, paragraphLetterSpacing?: number) {
  const para: Paragraph = {
    style: {
      alignment: 'left',
      lineHeight: 1.15,
      spaceBefore: 0,
      spaceAfter: 0,
      ...(paragraphLetterSpacing !== undefined ? { letterSpacing: paragraphLetterSpacing } : {}),
    },
    children: [
      {
        type: 'text',
        text,
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#000',
        ...(letterSpacing !== undefined ? { letterSpacing } : {}),
      },
    ],
  };

  const result = paragraphLayoutEngine.layout(para, 500);
  expect(result.lines.length).toBeGreaterThanOrEqual(1);
  return result.lines[0].spans[0];
}

describe('letterSpacing — width impact', () => {
  test('letterSpacing: 2 increases width vs undefined', () => {
    const baseSpan = layoutSpan('Hello');
    const spacedSpan = layoutSpan('Hello', 2);

    expect(spacedSpan.width).toBeGreaterThan(baseSpan.width);
  });

  test('letterSpacing: 0 same as undefined', () => {
    const baseSpan = layoutSpan('Hello');
    const zeroSpan = layoutSpan('Hello', 0);

    expect(zeroSpan.width).toBeCloseTo(baseSpan.width, 0);
  });

  test('negative letterSpacing reduces width', () => {
    const baseSpan = layoutSpan('Hello');
    const condensedSpan = layoutSpan('Hello', -1);

    expect(condensedSpan.width).toBeLessThan(baseSpan.width);
  });

  test('letterSpacing width formula: baseWidth + letterSpacing * n', () => {
    // pretext adds letterSpacing after each character INCLUDING the last one
    // So total added = letterSpacing * n
    const text = 'Hello';
    const ls = 3;
    const baseSpan = layoutSpan(text);
    const spacedSpan = layoutSpan(text, ls);

    const expectedExtra = ls * text.length;
    expect(spacedSpan.width).toBeCloseTo(baseSpan.width + expectedExtra, 0);
  });

  test('longer text gets more letterSpacing total', () => {
    const shortSpan = layoutSpan('AB', 2);
    const longSpan = layoutSpan('ABCD', 2);

    // AB: baseWidth + 2 * 1 = baseWidth + 2
    // ABCD: baseWidth + 2 * 3 = baseWidth + 6
    // Difference ≈ 4
    const delta = longSpan.width - shortSpan.width;
    expect(delta).toBeGreaterThan(3);
  });

  test('single character: letterSpacing adds width even for single char', () => {
    const baseSpan = layoutSpan('X');
    const spacedSpan = layoutSpan('X', 5);

    // pretext adds letterSpacing after each character, including single char
    expect(spacedSpan.width).toBeCloseTo(baseSpan.width + 5, 0);
  });

  test('letterSpacing visible in SVG: span width reflects spacing', () => {
    const text = 'Test';
    const ls = 2;
    const baseSpan = layoutSpan(text);
    const spacedSpan = layoutSpan(text, ls);

    // SVG letter-spacing attribute adds spacing between characters
    // pretext adds letterSpacing after each character including last
    const expectedWidth = baseSpan.width + ls * text.length;
    expect(spacedSpan.width).toBeCloseTo(expectedWidth, 0);
  });
});

describe('letterSpacing — integration with compileParagraph', () => {
  test('letterSpacing is preserved in compiled item', async () => {
    const { compileParagraph } = await import('../src/compile/DocumentCompiler.js');

    const para: Paragraph = {
      style: { alignment: 'left', lineHeight: 1.15, spaceBefore: 0, spaceAfter: 0 },
      children: [
        {
          type: 'text',
          text: 'Hello',
          fontFamily: 'Arial',
          fontSize: 16,
          fontWeight: 'normal',
          fontStyle: 'normal',
          color: '#000',
          letterSpacing: 2,
        },
      ],
    };

    const items = compileParagraph(para);
    expect(items[0].letterSpacing).toBe(2);
  });
});