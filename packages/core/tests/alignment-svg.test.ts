/**
 * alignment-svg.test.ts — SVG snapshot tests for text alignment.
 *
 * Each test renders a paragraph with specific alignment to SVG and compares
 * against a stored snapshot file via `assertRender`.
 *
 * Run: bun test packages/core/tests/alignment-svg.test.ts
 */

import './setup.ts';
import { paragraphLayoutEngine } from '../src/layout/ParagraphLayoutEngine.js';
import { renderResultToSVG } from '../src/render/SVGRenderer.js';
import { fontMetricsProvider } from '../src/measure/FontMetricsProvider.js';
import { makeParagraph, makeMultiRunParagraph, assertSvgSnapshot, assertRender, assertSvgTspanAttr, enableCanvasSnapshots } from './test-helpers.js';
import isSvg from 'is-svg';
import type { TextStyleOverrides } from './test-helpers.js';
import { DEFAULT_PARAGRAPH_STYLE } from '../src/types/Document.js';
import type { SvgPreset } from '../src/render/SVGRenderer.js';
import type { TextAlignment } from '../src/types/Document.js';

// ── Helpers ──────────────────────────────────────────────────────────────

/** Layout text with given alignment and return full result. */
function layoutText(text: string, maxWidth: number, alignment: TextAlignment, overrides?: Partial<{ lineHeight: number; indent: number; leftIndent: number; rightIndent: number }>) {
  const style = { ...DEFAULT_PARAGRAPH_STYLE, alignment, lineHeight: 1.2, ...overrides };
  const paragraph = {
    id: 'test-p',
    style,
    children: [{ type: 'text' as const, text, fontFamily: 'Unifont', fontSize: 16, fontWeight: 400, fontStyle: 'normal' as const, color: '#000000' }],
  };
  return paragraphLayoutEngine.layout(paragraph, maxWidth);
}

/** Layout multi-run and return full result. */
function layoutMulti(runs: { text: string; style?: TextStyleOverrides }[], maxWidth: number, alignment: TextAlignment) {
  const style = { ...DEFAULT_PARAGRAPH_STYLE, alignment, lineHeight: 1.2 };
  const paragraph = makeMultiRunParagraph(runs);
  paragraph.style = style;
  return paragraphLayoutEngine.layout(paragraph, maxWidth);
}

/** SVG snapshot helper for alignment tests (preserve preset). */
function alignSvgSnapshot(name: string, text: string, maxWidth: number, alignment: TextAlignment): string {
  const result = layoutText(text, maxWidth, alignment);
  const svg = renderResultToSVG(result, { preset: 'preserve' });
  expect(isSvg(svg)).toBe(true);
  assertSvgSnapshot(`align-${name}`, svg);
  return svg;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('alignment-svg', () => {
  describe('SVG snapshot', () => {
    enableCanvasSnapshots();

    beforeEach(() => { fontMetricsProvider.setMode('browser'); });

    it('align-left — multi-line left', async () => {
      const result = layoutText('AAA BBB CCC DDD EEE', 80, 'left');
      const svg = renderResultToSVG(result, { preset: 'preserve'});
      expect(isSvg(svg)).toBe(true);
      await assertRender('align-left', svg, result.lines);
    });

    it('align-center — multi-line center', async () => {
      const result = layoutText('AAA BBB CCC DDD EEE', 80, 'center');
      const svg = renderResultToSVG(result, { preset: 'preserve' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('align-center', svg, result.lines);
    });

    it('align-right — multi-line right', async () => {
      const result = layoutText('AAA BBB CCC DDD EEE', 80, 'right');
      const svg = renderResultToSVG(result, { preset: 'preserve'});
      expect(isSvg(svg)).toBe(true);
      await assertRender('align-right', svg, result.lines);
    });

    it('align-justify — multi-line justify', async () => {
      const result = layoutText('AAA BBB CCC DDD EEE FFF GGG', 100, 'justify');
      const svg = renderResultToSVG(result, { preset: 'preserve'});
      expect(isSvg(svg)).toBe(true);
      await assertRender('align-justify', svg, result.lines);
    });

    it('align-center-multiscript — Cyrillic + CJK centered', async () => {
      const text = 'Привет всем! 大家好！مرحبا';
      const result = layoutText(text, 150, 'center');
      const svg = renderResultToSVG(result, { preset: 'preserve'});
      expect(isSvg(svg)).toBe(true);
      await assertRender('align-center-multiscript', svg, result.lines);
    });

    it('align-justify-multi-run — justify with bold/italic', async () => {
      const result = layoutMulti([
        { text: 'Lorem ipsum ' },
        { text: 'dolor sit amet', style: { fontWeight: 700 } },
        { text: ' consectetur', style: { fontStyle: 'italic' } },
      ], 100, 'justify');
      const svg = renderResultToSVG(result, { preset: 'preserve'});
      expect(isSvg(svg)).toBe(true);
      await assertRender('align-justify-multi-run', svg, result.lines);
    });

    it('align-center-nowrap — single line center', async () => {
      const style = { ...DEFAULT_PARAGRAPH_STYLE, alignment: 'center' as const, lineHeight: 1.2, whiteSpace: 'nowrap' as const };
      const paragraph = {
        id: 'test-p',
        style,
        children: [{ type: 'text' as const, text: 'Hello this is centered line nowrap', fontFamily: 'Unifont', fontSize: 16, fontWeight: 400, fontStyle: 'normal' as const, color: '#000000' }],
      };
      const result = paragraphLayoutEngine.layout(paragraph, 500);
      const svg = renderResultToSVG(result, { preset: 'preserve'});
      expect(isSvg(svg)).toBe(true);
      await assertRender('align-center-nowrap', svg, result.lines);
    });

    it('align-right-nowrap — single line right', async () => {
      const style = { ...DEFAULT_PARAGRAPH_STYLE, alignment: 'right' as const, lineHeight: 1.2, whiteSpace: 'nowrap' as const };
      const paragraph = {
        id: 'test-p',
        style,
        children: [{ type: 'text' as const, text: 'Hello this is right aligned nowrap', fontFamily: 'Unifont', fontSize: 16, fontWeight: 400, fontStyle: 'normal' as const, color: '#000000' }],
      };
      const result = paragraphLayoutEngine.layout(paragraph, 500);
      const svg = renderResultToSVG(result, { preset: 'preserve'});
      expect(isSvg(svg)).toBe(true);
      await assertRender('align-right-nowrap', svg, result.lines);
    });

    it('align-center-multirun-nowrap — multi-run center nowrap', async () => {
      const style = { ...DEFAULT_PARAGRAPH_STYLE, alignment: 'center' as const, lineHeight: 1.2, whiteSpace: 'nowrap' as const };
      const paragraph = makeMultiRunParagraph([
        { text: 'Normal ' },
        { text: 'Bold', style: { fontWeight: 700, fontSize: 36 } },
        { text: ' Italic', style: { fontStyle: 'italic' as const } },
      ]);
      paragraph.style = style;
      const result = paragraphLayoutEngine.layout(paragraph, 500);
      const svg = renderResultToSVG(result, { preset: 'preserve'});
      expect(isSvg(svg)).toBe(true);
      await assertRender('align-center-multirun-nowrap', svg, result.lines);
    });

    // ── Glyph preset alignment snapshots ─────────────────────
    // Uses explicit <tspan x="..."> per fragment — text-anchor
    // is NOT set on <text> (defaults to "start"). Alignment is
    // purely via fragment x coordinates from PositioningEngine.

    it('glyph align-left', async () => {
      const result = layoutText('AAA BBB CCC DDD EEE', 80, 'left');
      const svg = renderResultToSVG(result, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).not.toContain('text-anchor');
      await assertRender('glyph-align-left', svg, result.lines);
    });

    it('glyph align-center', async () => {
      const result = layoutText('AAA BBB CCC DDD EEE', 80, 'center');
      const svg = renderResultToSVG(result, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).not.toContain('text-anchor');
      await assertRender('glyph-align-center', svg, result.lines);
    });

    it('glyph align-right', async () => {
      const result = layoutText('AAA BBB CCC DDD EEE', 80, 'right');
      const svg = renderResultToSVG(result, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).not.toContain('text-anchor');
      await assertRender('glyph-align-right', svg, result.lines);
    });

    it('glyph align-nowrap — center', async () => {
      const style = { ...DEFAULT_PARAGRAPH_STYLE, alignment: 'center' as const, lineHeight: 1.2, whiteSpace: 'nowrap' as const };
      const paragraph = {
        id: 'test-p',
        style,
        children: [{ type: 'text' as const, text: 'Hello glyph centered', fontFamily: 'Unifont', fontSize: 16, fontWeight: 400, fontStyle: 'normal' as const, color: '#000000' }],
      };
      const result = paragraphLayoutEngine.layout(paragraph, 300);
      const svg = renderResultToSVG(result, { preset: 'glyph' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).not.toContain('text-anchor');
      await assertRender('glyph-align-center-nowrap', svg, result.lines);
    });

    it('glyph align-nowrap — right', async () => {
      const style = { ...DEFAULT_PARAGRAPH_STYLE, alignment: 'right' as const, lineHeight: 1.2, whiteSpace: 'nowrap' as const };
      const paragraph = {
        id: 'test-p',
        style,
        children: [{ type: 'text' as const, text: 'Hello glyph right', fontFamily: 'Unifont', fontSize: 16, fontWeight: 400, fontStyle: 'normal' as const, color: '#000000' }],
      };
      const result = paragraphLayoutEngine.layout(paragraph, 500);
      const svg = renderResultToSVG(result, { preset: 'glyph' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).not.toContain('text-anchor');
      await assertRender('glyph-align-right-nowrap', svg, result.lines);
    });
  });
});