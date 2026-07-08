/**
 * run-office-svg.test.ts — SVG snapshot tests for a single text run
 * in Office (DrawingML) metrics mode.
 *
 * Uses `fontMetricsProvider.setMode('office')` and renders with `preset: 'glyph'`.
 *
 * Run: bun test packages/core/tests/run-office-svg.test.ts
 */

import './setup.ts';
import { paragraphLayoutEngine } from '../src/layout/ParagraphLayoutEngine.js';
import { renderToSVG } from '../src/render/SVGRenderer.js';
import { makeParagraph, makeStyledParagraph, makeMultiRunParagraph, assertSvgSnapshot, assertRender, enableCanvasSnapshots } from './test-helpers.js';
import isSvg from 'is-svg';
import type { Paragraph } from '../src/types/Document.js';
import type { TextStyleOverrides } from './test-helpers.js';
import { DEFAULT_PARAGRAPH_STYLE } from '../src/types/Document.js';
import { fontMetricsProvider } from '../src/measure/FontMetricsProvider.js';

// ── Helpers ──────────────────────────────────────────────────────────────

/** Render to SVG (glyph preset) and snapshot using `run-office-{name}`. */
function runSvgSnapshot(name: string, paragraph: Paragraph): string {
  const result = paragraphLayoutEngine.layout(paragraph, 500);
  const svg = renderToSVG(result.lines, {
    preset: 'glyph',
    sizing: 'content',
  });
  expect(isSvg(svg)).toBe(true);
  assertSvgSnapshot(`run-office-${name}`, svg);
  return svg;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('run-office-svg', () => {
  describe('office glyph', () => {
    enableCanvasSnapshots();

    beforeEach(() => { fontMetricsProvider.setMode('office'); });

    it('run-basic — "Hello"', async () => {
      const result = paragraphLayoutEngine.layout(makeParagraph('Hello'), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).toContain('Hello');
      await assertRender('run-office-basic', svg, result.lines);
    });

    it('run-long-word — "Hello"', async () => {
      const result = paragraphLayoutEngine.layout(makeParagraph('Hello World it is Run'), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('run-office-long-word', svg, result.lines);
    });

    it('run-leading-spaces — "  Hello World" → trimmed', async () => {
      const result = paragraphLayoutEngine.layout(makeParagraph('  Hello World'), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('run-office-leading-spaces', svg, result.lines);
    });

    it('run-trailing-spaces — "Hello World  " → trimmed', async () => {
      const result = paragraphLayoutEngine.layout(makeParagraph('Hello World  '), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('run-office-trailing-spaces', svg, result.lines);
    });

    it('run-multi-run — "Hello" + " World"', async () => {
      const paragraph = makeMultiRunParagraph([
        { text: 'Hello' },
        { text: ' World' },
      ]);
      const result = paragraphLayoutEngine.layout(paragraph, 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).toContain('Hello');
      expect(svg).toContain('World');
      await assertRender('run-office-multi-run', svg, result.lines);
    });

    it('run-bold — "Bold" (700)', async () => {
      const result = paragraphLayoutEngine.layout(makeStyledParagraph('Bold', { fontWeight: 700 }), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('run-office-bold', svg, result.lines);
    });

    it('run-italic — "Italic" (italic)', async () => {
      const result = paragraphLayoutEngine.layout(makeStyledParagraph('Italic', { fontStyle: 'italic' }), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('run-office-italic', svg, result.lines);
    });

    it('run-color-red — "Red" (#FF0000)', async () => {
      const result = paragraphLayoutEngine.layout(makeStyledParagraph('Red', { color: '#FF0000' }), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('run-office-color-red', svg, result.lines);
    });

    it('run-color-blue — "Blue" (#0000FF)', async () => {
      const result = paragraphLayoutEngine.layout(makeStyledParagraph('Blue', { color: '#0000FF' }), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('run-office-color-blue', svg, result.lines);
    });

    it('run-fontsize-24 — "Big" (24px)', async () => {
      const result = paragraphLayoutEngine.layout(makeParagraph('Big', 24), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('run-office-fontsize-24', svg, result.lines);
    });

    it('run-underline — "Under" (underline)', async () => {
      const result = paragraphLayoutEngine.layout(makeStyledParagraph('Under', { underline: true }), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('run-office-underline', svg, result.lines);
    });

    it('run-strikethrough — "Strike" (strikethrough)', async () => {
      const result = paragraphLayoutEngine.layout(makeStyledParagraph('Strike', { strikethrough: true }), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('run-office-strikethrough', svg, result.lines);
    });

    it('run-multiscript — "AБ你" Latin + Cyrillic + CJK', async () => {
      const paragraph = makeParagraph('AБ你');
      const result = paragraphLayoutEngine.layout(paragraph, 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('run-office-multiscript', svg, result.lines);
    });
  });
});