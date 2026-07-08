/**
 * wrap-office-svg.test.ts — SVG snapshot tests for text wrapping
 * in Office (DrawingML) metrics mode.
 *
 * Uses `fontMetricsProvider.setMode('office')` and renders with `preset: 'glyph'`.
 *
 * Run: bun test packages/core/tests/wrap-office-svg.test.ts
 */

import './setup.ts';
import { paragraphLayoutEngine } from '../src/layout/ParagraphLayoutEngine.js';
import { renderToSVG } from '../src/render/SVGRenderer.js';
import { fontMetricsProvider } from '../src/measure/FontMetricsProvider.js';
import { makeParagraph, makeMultiRunParagraph, assertRender, enableCanvasSnapshots } from './test-helpers.js';
import isSvg from 'is-svg';
import { DEFAULT_PARAGRAPH_STYLE } from '../src/types/Document.js';

// ── Helpers ──────────────────────────────────────────────────────────────

/** Layout and return full result (wraps at maxWidth). */
function layoutText(text: string, maxWidth: number) {
  const style = { ...DEFAULT_PARAGRAPH_STYLE, alignment: 'left' as const, lineHeight: 1.2 };
  const paragraph = {
    id: 'test-p',
    style,
    children: [{ type: 'text' as const, text, fontFamily: 'Unifont', fontSize: 16, fontWeight: 400, fontStyle: 'normal' as const, color: '#000000' }],
  };
  return paragraphLayoutEngine.layout(paragraph, maxWidth);
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('wrap-office-svg', () => {
  describe('office glyph', () => {
    enableCanvasSnapshots();

    beforeEach(() => { fontMetricsProvider.setMode('office'); });

    it('wrap-basic — "AAA BBB" narrow', async () => {
      const result = layoutText('AAA BBB', 30);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('wrap-office-basic', svg, result.lines);
    });

    it('wrap-hard-break — lines with \\n', async () => {
      const result = layoutText('Hello\nWorld\nTest', 200);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('wrap-office-hard-break', svg, result.lines);
    });

    it('wrap-long-word — "DDDDDD" in 10px', async () => {
      const result = layoutText('DDDDDD', 10);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('wrap-office-long-word', svg, result.lines);
    });

    it('wrap-multi-run — mixed styles wrap', async () => {
      const runs = [
        { text: 'Lorem ipsum ' },
        { text: 'dolor sit amet', style: { fontWeight: 700 } },
        { text: ' consectetur', style: { fontStyle: 'italic' as const } },
      ];
      const result = paragraphLayoutEngine.layout(makeMultiRunParagraph(runs), 100);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('wrap-office-multi-run', svg, result.lines);
    });

    it('wrap-long-sentence — long sentence in narrow container', async () => {
      const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
      const result = layoutText(text, 100);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('wrap-office-long-sentence', svg, result.lines);
    });

    it('wrap-very-long-word — "Pneumonoultramicroscopicsilicovolcanoconiosis" narrow', async () => {
      const result = layoutText('Pneumonoultramicroscopicsilicovolcanoconiosis', 30);
      const svg = renderToSVG(result.lines, { preset: 'glyph', sizing: 'content' });
      expect(isSvg(svg)).toBe(true);
      await assertRender('wrap-office-very-long-word', svg, result.lines);
    });
  });
});