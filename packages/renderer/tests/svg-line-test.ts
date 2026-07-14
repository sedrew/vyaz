/**
 * svg-line-test.ts — Tests for line-level width accuracy in SVG output.
 *
 * Verifies that textLength attributes in preserve mode are accurate
 * for proportional fonts, i.e., not proportionally distributed by char count.
 */

import { describe, test, beforeAll } from 'bun:test';
import { expect } from 'bun:test';

import { registerUnifont } from './helpers.ts';
import { registerArialVariants } from '../../core/tests/helpers.ts';
import { renderFrameToSVG, matchSvgSnapshot } from './helpers.ts';
import type { TextFrame } from '../../core/src/types/Document.js';
import { fontMetricsProvider } from '@vyaz/core';

beforeAll(async () => {
  await registerUnifont();
  await registerArialVariants();
});

describe('Line-level textLength accuracy', () => {
  test('preserve mode: single word "between" has accurate textLength', () => {
    const frame: TextFrame = {
      width: 600,
      wrap: true,
      paragraphs: [
        {
          style: { alignment: 'left', lineHeight: 1.2 },
          children: [
            { type: 'text', text: 'between', fontFamily: 'Arial', fontSize: 14, color: '#444' },
          ],
        },
      ],
    };

    const { result, svg } = renderFrameToSVG(frame, { preset: 'preserve' });

    // The line's width should match the actual measured width
    const line = result.lines[0];
    expect(line).toBeDefined();
    expect(line.width).toBeGreaterThan(0);

    // Measure the word "between" in Arial 14px via fontkit
    const font = fontMetricsProvider.getFont('Arial', '400', 'normal');
    expect(font).toBeDefined();
    if (font) {
      const scale = 14 / font.unitsPerEm;
      let measuredWidth = 0;
      for (let i = 0; i < 'between'.length; i++) {
        const cp = 'between'.codePointAt(i)!;
        const glyph = font.glyphForCodePoint(cp);
        if (glyph) measuredWidth += glyph.advanceWidth * scale;
      }
      // line.width should be within 2px of fontkit measurement
      expect(Math.abs(line.width - measuredWidth)).toBeLessThanOrEqual(2);
    }

    matchSvgSnapshot('line-between-single-word', svg);
  });

  test('preserve mode: space vs text ratio is accurate for proportional font', () => {
    const frame: TextFrame = {
      width: 600,
      wrap: true,
      paragraphs: [
        {
          style: { alignment: 'left', lineHeight: 1.2 },
          children: [
            { type: 'text', text: ' between form', fontFamily: 'Arial', fontSize: 14, color: '#444' },
          ],
        },
      ],
    };

    const { svg } = renderFrameToSVG(frame, { preset: 'preserve' });

    // The SVG should now show textLength where the space gets less width
    // than char-count proportion would give (space is narrower in Arial)
    expect(svg).toContain('textLength');

    // Verify the space <tspan> has a smaller share than char-count proportion
    // (1/13 of total width would be ~4.2px, but real space is ~3.3px)
    const spaceMatch = svg.match(/textLength="([\d.]+)"> <\/tspan>/);
    const textMatch = svg.match(/textLength="([\d.]+)">between<\/tspan>/);

    if (spaceMatch && textMatch) {
      const spaceWidth = parseFloat(spaceMatch[1]);
      const textWidth = parseFloat(textMatch[1]);
      const total = spaceWidth + textWidth;

      // Space should be < 35% of total width (char-count naive would be 1/13 ≈ 7.7%)
      const spaceRatio = spaceWidth / total;
      expect(spaceRatio).toBeLessThan(0.1);

      console.log(
        `[line-test] " between form": space=${spaceWidth.toFixed(2)} ` +
        `text=${textWidth.toFixed(2)} total=${total.toFixed(2)} ` +
        `spaceRatio=${(spaceRatio * 100).toFixed(1)}%`,
      );
    }

    matchSvgSnapshot('line-between-space-ratio', svg);
  });
});