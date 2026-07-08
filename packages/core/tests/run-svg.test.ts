/**
 * run-svg.test.ts — SVG snapshot tests for a single text run.
 *
 * Each test renders a paragraph to SVG and compares against a stored
 * snapshot file via `assertRender` (SVG + optional PNG).
 *
 * Run: bun test packages/core/tests/run-svg.test.ts
 */

import './setup.ts';
import { paragraphLayoutEngine } from '../src/layout/ParagraphLayoutEngine.js';
import { renderToSVG } from '../src/render/SVGRenderer.js';
import { makeParagraph, makeStyledParagraph, makeMultiRunParagraph, assertSvgSnapshot, assertRender, assertSvgTspanAttr, enableCanvasSnapshots } from './test-helpers.js';
import isSvg from 'is-svg';
import type { Paragraph } from '../src/types/Document.js';
import type { TextStyleOverrides } from './test-helpers.js';
import { DEFAULT_PARAGRAPH_STYLE } from '../src/types/Document.js';
import type { SvgPreset } from '../src/render/SVGRenderer.js';

// ── Helpers ──────────────────────────────────────────────────────────────

/** Layout single-run paragraph and return the first line (or null). */
function singleLine(text: string, fontSize = 16) {
  const result = paragraphLayoutEngine.layout(makeParagraph(text, fontSize), 500);
  return result.lines[0] ?? null;
}

/** Layout single-run paragraph and return full result. */
function singleResult(text: string, fontSize = 16) {
  return paragraphLayoutEngine.layout(makeParagraph(text, fontSize), 500);
}

/** Layout single-run paragraph with style override and return first line. */
function styledLine(text: string, overrides: TextStyleOverrides) {
  const result = paragraphLayoutEngine.layout(makeStyledParagraph(text, overrides), 500);
  return result.lines[0] ?? null;
}

/** Layout multi-run paragraph and return first line. */
function multiLine(...runs: { text: string; style?: TextStyleOverrides }[]) {
  const result = paragraphLayoutEngine.layout(makeMultiRunParagraph(runs), 500);
  return result.lines[0] ?? null;
}

/** Layout multi-run paragraph and return full result. */
function multiResult(...runs: { text: string; style?: TextStyleOverrides }[]) {
  return paragraphLayoutEngine.layout(makeMultiRunParagraph(runs), 500);
}

/** Render to SVG (preserve preset) and snapshot using `run-{name}`. */
function runSvgSnapshot(name: string, paragraph: Paragraph): string {
  const result = paragraphLayoutEngine.layout(paragraph, 500);
  const svg = renderToSVG(result.lines, {
    preset: 'preserve',
    sizing: 'content',
  });
  expect(isSvg(svg)).toBe(true);
  assertSvgSnapshot(`run-${name}`, svg);
  return svg;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('run-svg', () => {
  // ── SVG snapshots — visual regression ────────────────────────────

  describe('SVG snapshot', () => {
    const SVG_PRESET: SvgPreset = 'preserve';
    enableCanvasSnapshots();

    it('run-basic', async () => {
      const result = paragraphLayoutEngine.layout(makeParagraph('Hello'), 500);
      const svg = renderToSVG(result.lines, { preset: SVG_PRESET, sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).toContain('Hello');
      await assertRender('run-basic', svg, result.lines);
    });

    it('run-hello-world — snapshot "Hello World"', async () => {
      const result = paragraphLayoutEngine.layout(makeParagraph('Hello World'), 500);
      const svg = renderToSVG(result.lines, { preset: SVG_PRESET, sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).toContain('Hello World');
      await assertRender('run-hello-world', svg, result.lines);
    });

    it('run-leading-spaces — snapshot "  Hello World" → trimmed', async () => {
      const result = paragraphLayoutEngine.layout(makeParagraph('  Hello World'), 500);
      const svg = renderToSVG(result.lines, { preset: SVG_PRESET, sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).toContain('Hello');
      expect(svg).not.toContain('>  Hello</tspan>');
      await assertRender('run-leading-spaces', svg, result.lines);
    });

    it('run-trailing-spaces — snapshot "Hello World  " → trimmed', async () => {
      const result = paragraphLayoutEngine.layout(makeParagraph('Hello World  '), 500);
      const svg = renderToSVG(result.lines, { preset: SVG_PRESET, sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).toContain('Hello');
      await assertRender('run-trailing-spaces', svg, result.lines);
    });

    it('run-hello-world-multi — snapshot multi-run "Hello" + " World"', async () => {
      const paragraph = makeMultiRunParagraph([
        { text: 'Hello' },
        { text: ' World' },
      ]);
      const result = paragraphLayoutEngine.layout(paragraph, 500);
      const svg = renderToSVG(result.lines, { preset: SVG_PRESET, sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).toContain('Hello');
      expect(svg).toContain('World');
      await assertRender('run-hello-world-multi', svg, result.lines);
    });

    it('run-bold — SVG tspan has font-weight="700"', async () => {
      const result = paragraphLayoutEngine.layout(makeStyledParagraph('Bold', { fontWeight: 700 }), 500);
      const svg = renderToSVG(result.lines, { preset: SVG_PRESET, sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      assertSvgTspanAttr(svg, 'Bold', 'font-weight="700"');
      await assertRender('run-bold', svg, result.lines);
    });

    it('run-italic — SVG tspan has font-style="italic"', async () => {
      const result = paragraphLayoutEngine.layout(makeStyledParagraph('Italic', { fontStyle: 'italic' }), 500);
      const svg = renderToSVG(result.lines, { preset: SVG_PRESET, sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      assertSvgTspanAttr(svg, 'Italic', 'font-style="italic"');
      await assertRender('run-italic', svg, result.lines);
    });

    it('run-color-red — SVG tspan has fill="#FF0000"', async () => {
      const result = paragraphLayoutEngine.layout(makeStyledParagraph('Red', { color: '#FF0000' }), 500);
      const svg = renderToSVG(result.lines, { preset: SVG_PRESET, sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      assertSvgTspanAttr(svg, 'Red', 'fill="#FF0000"');
      await assertRender('run-color-red', svg, result.lines);
    });

    it('run-color-blue — SVG tspan has fill="#0000FF"', async () => {
      const result = paragraphLayoutEngine.layout(makeStyledParagraph('Blue', { color: '#0000FF' }), 500);
      const svg = renderToSVG(result.lines, { preset: SVG_PRESET, sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      assertSvgTspanAttr(svg, 'Blue', 'fill="#0000FF"');
      await assertRender('run-color-blue', svg, result.lines);
    });

    it('run-fontsize-24 — SVG tspan has font-size="24"', async () => {
      const result = paragraphLayoutEngine.layout(makeParagraph('Big', 24), 500);
      const svg = renderToSVG(result.lines, { preset: SVG_PRESET, sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      assertSvgTspanAttr(svg, 'Big', 'font-size="24"');
      await assertRender('run-fontsize-24', svg, result.lines);
    });

    it('run-underline — SVG tspan has text-decoration="underline"', async () => {
      const result = paragraphLayoutEngine.layout(makeStyledParagraph('Under', { underline: true }), 500);
      const svg = renderToSVG(result.lines, { preset: SVG_PRESET, sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      assertSvgTspanAttr(svg, 'Under', 'text-decoration="underline"');
      await assertRender('run-underline', svg, result.lines);
    });

    it('run-strikethrough — SVG tspan has text-decoration="line-through"', async () => {
      const result = paragraphLayoutEngine.layout(makeStyledParagraph('Strike', { strikethrough: true }), 500);
      const svg = renderToSVG(result.lines, { preset: SVG_PRESET, sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      assertSvgTspanAttr(svg, 'Strike', 'text-decoration="line-through"');
      await assertRender('run-strikethrough', svg, result.lines);
    });

    it('run-multiscript — Latin + Cyrillic + CJK together', async () => {
      const paragraph = makeParagraph('AБ你');
      const result = paragraphLayoutEngine.layout(paragraph, 500);
      const svg = renderToSVG(result.lines, { preset: SVG_PRESET, sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('run-multiscript', svg, result.lines);
    });

    it('run-multilingual-full — full sentence on 5 scripts (nowrap, single line)', async () => {
      // English, Russian, Chinese, Arabic, Hindi — nowrap → one line
      const text = 'Hello everyone! Привет всем! 大家好！مرحبا بالجميع！सभी को नमस्ते!';
      const paragraph: Paragraph = {
        id: 'test-p',
        style: { ...DEFAULT_PARAGRAPH_STYLE, alignment: 'left', lineHeight: 1.2, whiteSpace: 'nowrap' },
        children: [{ type: 'text', text, fontFamily: 'Unifont', fontSize: 16, fontWeight: 400, fontStyle: 'normal', color: '#000000' }],
      };
      const result = paragraphLayoutEngine.layout(paragraph, 500);
      const svg = renderToSVG(result.lines, { preset: SVG_PRESET, sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      expect(svg).toContain('Hello');
      expect(svg).toContain('Привет');
      expect(svg).toContain('大家好');
      expect(svg).toContain('مرحبا');
      expect(svg).toContain('नमस्ते');
      await assertRender('run-multilingual-full', svg, result.lines);
    });

    // ── Glyph preset — per-glyph positioning ─────────────────────
    //
    // The 'glyph' preset renders each fragment as <tspan x="x0 x1 x2 ...">
    // with per-character positions. Since Unifont is monospace, each char
    // gets equal advance. No text-anchor is set on <text> (defaults to "start").

    it('run-glyph — single word each glyph has own x position via glyphAdvances', async () => {
      const result = paragraphLayoutEngine.layout(makeParagraph('ABCDE'), 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      // tspan should have 5 x positions for 5 characters
      const tspanMatch = svg.match(/<tspan x="([\d. ]+)">/);
      expect(tspanMatch).not.toBeNull();
      const positions = tspanMatch![1].split(' ').map(Number);
      expect(positions.length).toBe(5); // A B C D E
      // Each position should be monotonically increasing
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i]).toBeGreaterThan(positions[i - 1]);
      }
      // No text-anchor attribute
      expect(svg).not.toContain('text-anchor');
      await assertRender('run-glyph', svg, result.lines);
    });

    it('run-glyph-align-center — glyph preset with center alignment', async () => {
      const style = { ...DEFAULT_PARAGRAPH_STYLE, alignment: 'center' as const, lineHeight: 1.2, whiteSpace: 'nowrap' as const };
      const paragraph: Paragraph = {
        id: 'test-p',
        style,
        children: [{ type: 'text', text: 'ABCDE', fontFamily: 'Unifont', fontSize: 16, fontWeight: 400, fontStyle: 'normal', color: '#000000' }],
      };
      const result = paragraphLayoutEngine.layout(paragraph, 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      // First x position should be shifted right (center aligned)
      const tspanMatch = svg.match(/<tspan x="([\d. ]+)">/);
      expect(tspanMatch).not.toBeNull();
      const positions = tspanMatch![1].split(' ').map(Number);
      expect(positions[0]).toBeGreaterThan(0); // centered, not x=0
      expect(positions.length).toBe(5);
      expect(svg).not.toContain('text-anchor');
      await assertRender('run-glyph-align-center', svg, result.lines);
    });

    it('run-glyph-align-right — glyph preset with right alignment', async () => {
      const style = { ...DEFAULT_PARAGRAPH_STYLE, alignment: 'right' as const, lineHeight: 1.2, whiteSpace: 'nowrap' as const };
      const paragraph: Paragraph = {
        id: 'test-p',
        style,
        children: [{ type: 'text', text: 'ABCDE', fontFamily: 'Unifont', fontSize: 16, fontWeight: 400, fontStyle: 'normal', color: '#000000' }],
      };
      const result = paragraphLayoutEngine.layout(paragraph, 500);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      // First x position should be further right (right aligned)
      const tspanMatch = svg.match(/<tspan x="([\d. ]+)">/);
      expect(tspanMatch).not.toBeNull();
      const positions = tspanMatch![1].split(' ').map(Number);
      expect(positions[0]).toBeGreaterThan(0);
      expect(positions.length).toBe(5);
      expect(svg).not.toContain('text-anchor');
      await assertRender('run-glyph-align-right', svg, result.lines);
    });
  });
});