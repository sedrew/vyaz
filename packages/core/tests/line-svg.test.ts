/**
 * line-svg.test.ts — SVG snapshot tests for a single line with multiple runs.
 *
 * Each test renders a multi-run paragraph to SVG and compares against a stored
 * snapshot file via `assertRender`.
 *
 * Run: bun test packages/core/tests/line-svg.test.ts
 */

import './setup.ts';
import { paragraphLayoutEngine } from '../src/layout/ParagraphLayoutEngine.js';
import { renderToSVG } from '../src/render/SVGRenderer.js';
import { makeMultiRunParagraph, assertSvgSnapshot, assertRender, assertSvgTspanAttr, enableCanvasSnapshots } from './test-helpers.js';
import isSvg from 'is-svg';
import type { TextStyleOverrides } from './test-helpers.js';
import type { SvgPreset } from '../src/render/SVGRenderer.js';

// ── Helpers ──────────────────────────────────────────────────────────────

/** Layout multi-run paragraph and return full result. */
function multiResult(...runs: { text: string; style?: TextStyleOverrides }[]) {
  return paragraphLayoutEngine.layout(makeMultiRunParagraph(runs), 500);
}

/** Render to SVG (preserve preset) and snapshot using `line-{name}`. */
function lineSvgSnapshot(name: string, ...runs: { text: string; style?: TextStyleOverrides }[]): string {
  const result = paragraphLayoutEngine.layout(makeMultiRunParagraph(runs), 500);
  const svg = renderToSVG(result.lines, {
    preset: 'preserve',
    sizing: 'content',
  });
  expect(isSvg(svg)).toBe(true);
  assertSvgSnapshot(`line-${name}`, svg);
  return svg;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('line-svg', () => {
  describe('SVG snapshot', () => {
    enableCanvasSnapshots();

    it('line-basic — "Hello" + " World"', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'Hello' },
        { text: ' World' },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'preserve', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).toContain('Hello');
      expect(svg).toContain('World');
      await assertRender('line-basic', svg, result.lines);
      expect(svg).toContain('Hello');
      expect(svg).toContain('World');
    });

    it('line-bold-mid — "Normal" + " Bold" (bold)', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'Normal' },
        { text: ' Bold', style: { fontWeight: 700 } },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'preserve', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      assertSvgTspanAttr(svg, 'Bold', 'font-weight="700"');
      await assertRender('line-bold-mid', svg, result.lines);
    });

    it('line-italic-mid — "Normal" + " Italic" (italic)', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'Normal' },
        { text: ' Italic', style: { fontStyle: 'italic' } },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'preserve', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      assertSvgTspanAttr(svg, 'Italic', 'font-style="italic"');
      await assertRender('line-italic-mid', svg, result.lines);
    });

    it('line-color-mid — "Black " + "Red" (red)', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'Black ' },
        { text: 'Red', style: { color: '#FF0000' } },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'preserve', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      assertSvgTspanAttr(svg, 'Red', 'fill="#FF0000"');
      await assertRender('line-color-mid', svg, result.lines);
    });

    it('line-fontsize-mixed — "Big " (24) + "Small" (12)', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'Big ', style: { fontSize: 24 } },
        { text: 'Small', style: { fontSize: 12 } },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'preserve', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      assertSvgTspanAttr(svg, 'Big', 'font-size="24"');
      assertSvgTspanAttr(svg, 'Small', 'font-size="12"');
      await assertRender('line-fontsize-mixed', svg, result.lines);
    });

    it('line-underline-mid — "No" + " Under" (underline)', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'No' },
        { text: ' Under', style: { underline: true } },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'preserve', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      assertSvgTspanAttr(svg, 'Under', 'text-decoration="underline"');
      await assertRender('line-underline-mid', svg, result.lines);
    });

    it('line-strikethrough-mid — "No" + " Strike" (strikethrough)', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'No' },
        { text: ' Strike', style: { strikethrough: true } },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'preserve', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      assertSvgTspanAttr(svg, 'Strike', 'text-decoration="line-through"');
      await assertRender('line-strikethrough-mid', svg, result.lines);
    });

    it('line-all-styles — bold + italic + red + underline', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'Bold ', style: { fontWeight: 700 } },
        { text: 'Italic ', style: { fontStyle: 'italic' } },
        { text: 'Red ', style: { color: '#FF0000' } },
        { text: 'Under', style: { underline: true } },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'preserve', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).toContain('Bold');
      expect(svg).toContain('Italic');
      expect(svg).toContain('Red');
      expect(svg).toContain('Under');
      await assertRender('line-all-styles', svg, result.lines);
    });

    it('line-mixed-metrics — fontSize 16 + 32 + underline', async () => {
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph([
        { text: 'Small ' },
        { text: 'Big ', style: { fontSize: 32 } },
        { text: 'Under', style: { underline: true } },
      ]), 500);
      const svg = renderToSVG(result.lines, { preset: 'preserve', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      assertSvgTspanAttr(svg, 'Big', 'font-size="32"');
      expect(svg).toContain('Under');
      await assertRender('line-mixed-metrics', svg, result.lines);
    });
  });
});