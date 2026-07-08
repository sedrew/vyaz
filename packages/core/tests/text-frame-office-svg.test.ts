/**
 * text-frame-office-svg.test.ts — SVG snapshot tests for TextFrame layout
 * in Office (DrawingML) metrics mode.
 *
 * Uses `fontMetricsProvider.setMode('office')` which enables OS/2-based
 * ascent/descent metrics and strict ascent+descent line heights (no lineHeight
 * multiplier). All tests render with `preset: 'glyph'` for per-glyph positioning.
 *
 * Run: bun test packages/core/tests/text-frame-office-svg.test.ts
 */

import './setup.ts';
import { layoutTextFrame } from '../src/layout/TextFrameLayoutEngine.js';
import type { TextFrameLayoutResult } from '../src/layout/TextFrameLayoutEngine.js';
import { renderToSVG } from '../src/render/SVGRenderer.js';
import type { SVGRenderOptions } from '../src/render/SVGRenderer.js';
import { fontMetricsProvider } from '../src/measure/FontMetricsProvider.js';
import type { TextFrame, Paragraph } from '../src/types/Document.js';
import { assertRender, enableCanvasSnapshots } from './test-helpers.js';
import isSvg from 'is-svg';

// ── Render helper ────────────────────────────────────────────────────────

/**
 * Render a TextFrameLayoutResult to SVG.
 *
 * SVG dimensions are resolved automatically via `fitHorizontal` / `fitVertical`:
 * - `'frame'`   → uses `frameWidth` / `frameHeight`
 * - `'content'` → uses `contentWidth` / `contentHeight`
 */
function renderTextFrameToSVG(
  result: TextFrameLayoutResult,
  options?: SVGRenderOptions,
): string {
  const width = result.fitHorizontal === 'frame'
    ? result.frameWidth!
    : result.contentWidth;
  const height = result.fitVertical === 'frame'
    ? result.frameHeight!
    : result.contentHeight;
  return renderToSVG(result.lines, { width, height, ...options });
}

// ── Paragraph builders ───────────────────────────────────────────────────

/** Build a single-run paragraph with custom text, alignment, and lineHeight. */
function buildParagraph(
  id: string,
  text: string,
  alignment: 'left' | 'center' | 'right' | 'justify' = 'left',
  lineHeight: number = 1.2,
  overrides?: Partial<{
    fontSize: number;
    spaceBefore: number;
    spaceAfter: number;
    indent: number;
    leftIndent: number;
    rightIndent: number;
    whiteSpace: 'normal' | 'nowrap' | 'pre';
  }>,
): Paragraph {
  return {
    id: id,
    style: {
      alignment,
      lineHeight,
      spaceBefore: overrides?.spaceBefore ?? 0,
      spaceAfter: overrides?.spaceAfter ?? 0,
      indent: overrides?.indent,
      leftIndent: overrides?.leftIndent,
      rightIndent: overrides?.rightIndent,
      whiteSpace: overrides?.whiteSpace ?? 'normal',
    },
    children: [{
      type: 'text',
      text,
      fontFamily: 'Unifont',
      fontSize: overrides?.fontSize ?? 16,
      fontWeight: 400,
      fontStyle: 'normal',
      color: '#000000',
    }],
  };
}

/** Build a paragraph with multiple runs of different font sizes. */
function buildMultiSizeParagraph(
  id: string,
  runs: { text: string; fontSize: number }[],
  alignment: 'left' | 'center' | 'right' | 'justify' = 'left',
  lineHeight: number = 1.2,
): Paragraph {
  return {
    id: id,
    style: { alignment, lineHeight, spaceBefore: 0, spaceAfter: 0 },
    children: runs.map(r => ({
      type: 'text' as const,
      text: r.text,
      fontFamily: 'Unifont',
      fontSize: r.fontSize,
      fontWeight: 400,
      fontStyle: 'normal',
      color: '#000000',
    })),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('text-frame-office-svg', () => {
  describe('office glyph', () => {
    enableCanvasSnapshots();

    beforeEach(() => { fontMetricsProvider.setMode('office'); });

    it('4-paragraphs different alignment + lineHeight', async () => {
      const paragraphs = [
        buildParagraph('p-left', 'Left aligned — this text uses default line height with soft wrapping enabled.', 'left', 1.2),
        buildParagraph('p-center', 'Center aligned — this text uses a larger line height for generous vertical spacing.', 'center', 1.6),
        buildParagraph('p-right', 'Right aligned — this text uses double line height for wide open spacing throughout.', 'right', 2.0),
        buildParagraph('p-justify', 'Justified paragraph — this text stretches spaces to fill the full width on every line except the final one.', 'justify', 1.15),
      ];

      const frame: TextFrame = {
        width: 350,
        wrap: true,
        paragraphs,
      };

      const result = layoutTextFrame(frame);
      const svg = renderTextFrameToSVG(result, { preset: 'glyph' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).not.toContain('text-anchor');
      await assertRender('frame-office-4-paragraphs', svg, result.lines);
    });

    it('long-wrapping-text', async () => {
      const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.';

      const frame: TextFrame = {
        width: 200,
        height: 600,
        wrap: true,
        paragraphs: [
          buildParagraph('p-long', longText, 'left', 2),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBeGreaterThanOrEqual(5);

      const svg = renderTextFrameToSVG(result, { preset: 'glyph' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).not.toContain('text-anchor');
      await assertRender('frame-office-long-wrap', svg, result.lines);
    });

    it('mixed-font-sizes within paragraph', async () => {
      const frame: TextFrame = {
        width: 500,
        height: 200,
        wrap: true,
        paragraphs: [
          buildMultiSizeParagraph('p-mixed', [
            { text: 'Small 12px ', fontSize: 12 },
            { text: 'BIG 28px ', fontSize: 28 },
            { text: 'Medium 18px ', fontSize: 18 },
            { text: 'back to small 12px', fontSize: 12 },
          ]),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBeGreaterThanOrEqual(1);

      const svg = renderTextFrameToSVG(result, { preset: 'glyph' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).not.toContain('text-anchor');
      await assertRender('frame-office-mixed-sizes', svg, result.lines);
    });

    it('spaceBefore-spaceAfter between paragraphs', async () => {
      const paragraphs = [
        buildParagraph('p1', 'First paragraph with spaceAfter=24.', 'left', 1.2, { spaceAfter: 24 }),
        buildParagraph('p2', 'Second paragraph with spaceBefore=12.', 'left', 1.2, { spaceBefore: 12 }),
        buildParagraph('p3', 'Third paragraph no extra spacing.', 'left', 1.2),
      ];

      const frame: TextFrame = {
        width: 400,
        height: 400,
        wrap: true,
        paragraphs,
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBe(3);

      const svg = renderTextFrameToSVG(result, { preset: 'glyph' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).not.toContain('text-anchor');
      await assertRender('frame-office-spacing', svg, result.lines);
    });

    it('padding shifts text inside frame', async () => {
      const frame: TextFrame = {
        width: 400,
        height: 300,
        wrap: true,
        padding: { top: 10, right: 20, bottom: 10, left: 30 },
        paragraphs: [
          buildParagraph('p1', 'Text with left padding 30px and right padding 20px, wrapping within the reduced content area.', 'left', 1.2),
        ],
      };

      const result = layoutTextFrame(frame);
      // All lines should start at x=30
      expect(result.lines[0].x).toBe(30);

      const svg = renderTextFrameToSVG(result, { preset: 'glyph' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).not.toContain('text-anchor');
      await assertRender('frame-office-padding', svg, result.lines);
    });

    it('glyph runs have unique ids — tspan from different runs not in same <text>', () => {
      // Verify that each run gets its own <text> element with
      // id="${paragraphId}-${itemIndex}"
      const paragraphs = [
        buildParagraph('p1', 'Left text.', 'left', 1.2),
        buildParagraph('p2', 'Center.', 'center', 1.4),
        {
          id: 'p3',
          style: { alignment: 'right' as const, lineHeight: 1.0, spaceBefore: 0, spaceAfter: 0 },
          children: [{
            type: 'text' as const,
            text: 'Run 0 ',
            fontFamily: 'Unifont',
            fontSize: 20,
            fontWeight: 300,
            fontStyle: 'normal' as const,
            color: 'Blue',
          },
          {
            type: 'text' as const,
            text: 'Run 1 bold',
            fontFamily: 'Unifont',
            fontSize: 14,
            fontWeight: 'bold' as const,
            fontStyle: 'normal' as const,
            color: 'Black'
          }],
        },
      ];

      const frame: TextFrame = {
        width: 250,
        wrap: true,
        paragraphs,
      };

      const result = layoutTextFrame(frame);
      const svg = renderTextFrameToSVG(result, { preset: 'glyph' });
      expect(isSvg(svg)).toBe(true);

      // Extract all <text id="..."> elements
      const textMatches = svg.matchAll(/<text[^>]*id="([^"]+)"[^>]*>[\s\S]*?<\/text>/g);
      for (const textEl of textMatches) {
        const content = textEl[0];

        // Count non-space tspans inside this <text>
        const textTspans = content.match(/<tspan[^>]*>[^<\s][^<]*<\/tspan>/g);
        const textTspanCount = textTspans ? textTspans.length : 0;

        // Each <text> with an id should contain exactly 1 text tspan
        expect(textTspanCount).toBe(1);
      }

      expect(svg).toContain('id="p3-0"');
      expect(svg).toContain('id="p3-1"');
    });

    it('two paragraphs different font sizes stack correctly', async () => {
      const frame: TextFrame = {
        width: 500,
        wrap: true,
        paragraphs: [
          buildParagraph('p-small', 'Small font paragraph text.', 'left', 1.2, { fontSize: 12 }),
          buildParagraph('p-large', 'Large font paragraph text.', 'left', 1.2, { fontSize: 28 }),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBe(2);
      // Second line should be below first
      expect(result.lines[1].y).toBeGreaterThan(result.lines[0].y);

      const svg = renderTextFrameToSVG(result, { preset: 'glyph' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).not.toContain('text-anchor');
      await assertRender('frame-office-font-sizes', svg, result.lines);
    });
  });
});