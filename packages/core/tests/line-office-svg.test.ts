/**
 * line-office-svg.test.ts — SVG snapshot tests for a multi-run line
 * in Office (DrawingML) metrics mode.
 *
 * Uses `fontMetricsProvider.setMode('office')` and renders with `preset: 'glyph'`.
 *
 * Run: bun test packages/core/tests/line-office-svg.test.ts
 */

import './setup.ts';
import { paragraphLayoutEngine } from '../src/layout/ParagraphLayoutEngine.js';
import { renderToSVG } from '../src/render/SVGRenderer.js';
import { makeMultiRunParagraph, assertRender, enableCanvasSnapshots } from './test-helpers.js';
import isSvg from 'is-svg';
import { fontMetricsProvider } from '../src/measure/FontMetricsProvider.js';

// ── Tests ────────────────────────────────────────────────────────────────

describe('line-office-svg', () => {
  describe('office glyph', () => {
    enableCanvasSnapshots();

    beforeEach(() => { fontMetricsProvider.setMode('office'); });

    it('line-basic — "Hello" + " World"', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'Hello' },
        { text: ' World' },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).toContain('Hello');
      expect(svg).toContain('World');
      await assertRender('line-office-basic', svg, result.lines);
    });

    it('line-bold-mid — "Normal" + " Bold" (bold)', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'Normal' },
        { text: ' Bold', style: { fontWeight: 700 } },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('line-office-bold-mid', svg, result.lines);
    });

    it('line-italic-mid — "Normal" + " Italic" (italic)', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'Normal' },
        { text: ' Italic', style: { fontStyle: 'italic' } },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('line-office-italic-mid', svg, result.lines);
    });

    it('line-color-mid — "Black " + "Red" (red)', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'Black ' },
        { text: 'Red', style: { color: '#FF0000' } },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('line-office-color-mid', svg, result.lines);
    });

    it('line-fontsize-mixed — "Big " (24) + "Small" (12)', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'Big ', style: { fontSize: 24 } },
        { text: 'Small', style: { fontSize: 12 } },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('line-office-fontsize-mixed', svg, result.lines);
    });

    it('line-underline-mid — "No" + " Under" (underline)', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'No' },
        { text: ' Under', style: { underline: true } },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('line-office-underline-mid', svg, result.lines);
    });

    it('line-strikethrough-mid — "No" + " Strike" (strikethrough)', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'No' },
        { text: ' Strike', style: { strikethrough: true } },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('line-office-strikethrough-mid', svg, result.lines);
    });

    it('line-all-styles — bold + italic + red + underline', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'Bold ', style: { fontWeight: 700 } },
        { text: 'Italic ', style: { fontStyle: 'italic' } },
        { text: 'Red ', style: { color: '#FF0000' } },
        { text: 'Under', style: { underline: true } },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).toContain('Bold');
      expect(svg).toContain('Italic');
      expect(svg).toContain('Red');
      expect(svg).toContain('Under');
      await assertRender('line-office-all-styles', svg, result.lines);
    });

    it('line-mixed-metrics — fontSize 16 + 32 + underline', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'Small ' },
        { text: 'Big ', style: { fontSize: 32 } },
        { text: 'Under', style: { underline: true } },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).toContain('Under');
      await assertRender('line-office-mixed-metrics', svg, result.lines);
    });

    it('line-long-word — "Hello" + "DDDDDD" (long word)', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'Hello ' },
        { text: 'DDDDDD' },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).toContain('Hello');
      expect(svg).toContain('DDDDDD');
      await assertRender('line-office-long-word', svg, result.lines);
    });

    it('line-very-long-word — "Hello" + "Pneumonoultramicroscopicsilicovolcanoconiosis"', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'Hello ' },
        { text: 'Pneumonoultramicroscopicsilicovolcanoconiosis' },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).toContain('Hello');
      expect(svg).toContain('Pneumonoultramicroscopicsilicovolcanoconiosis');
      await assertRender('line-office-very-long-word', svg, result.lines);
    });

    it('line-three-runs — "A" + " B" + " C" with spaces', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'A' },
        { text: ' B' },
        { text: ' C' },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('line-office-three-runs', svg, result.lines);
    });
  });
});