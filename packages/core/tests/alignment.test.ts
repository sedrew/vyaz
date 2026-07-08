/**
 * alignment.test.ts — text alignment tests (Paragraph level).
 *
 * Covers:
 * - Left / Center / Right / Justify alignment
 * - Single-line and multi-line
 * - Multi-run with different styles
 * - Multi-script (Cyrillic, CJK, Arabic, Hindi)
 * - contentWidth consistency across alignments
 *
 * Run: bun test packages/core/tests/alignment.test.ts
 */

import './setup.ts';
import { paragraphLayoutEngine } from '../src/layout/ParagraphLayoutEngine.js';
import { fontMetricsProvider } from '../src/measure/FontMetricsProvider.js';
import { makeParagraph, makeMultiRunParagraph } from './test-helpers.js';
import type { TextStyleOverrides } from './test-helpers.js';
import { DEFAULT_PARAGRAPH_STYLE } from '../src/types/Document.js';
import type { TextAlignment } from '../src/types/Document.js';
import type { LineBox } from '../src/types/LayoutTypes.js';

// ── Helpers ──────────────────────────────────────────────────────────────

/** Assert line.width matches actual fragment extents. */
function assertLineWidthCorrect(line: LineBox): void {
  if (line.fragments.length === 0) return;
  const lastFrag = line.fragments[line.fragments.length - 1];
  const actualContentWidth = lastFrag.x + lastFrag.width;
  expect(line.width).toBeCloseTo(actualContentWidth, 2);
}

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

/** Compute slack = maxWidth - indent - lineWidth */
function computeSlack(maxWidth: number, lineWidth: number, indent: number = 0, rightIndent: number = 0) {
  return Math.max(0, maxWidth - indent - rightIndent - lineWidth);
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('alignment', () => {
  describe('left', () => {
    beforeEach(() => { fontMetricsProvider.setMode('browser'); });

    it('single line starts at x=0 (no indent)', () => {
      const result = layoutText('Hello', 500, 'left');
      expect(result.lines[0].x).toBe(0);
    });

    it('multi-line all start at x=0', () => {
      const result = layoutText('AAA BBB CCC DDD', 40, 'left');
      expect(result.lines.length).toBeGreaterThan(1);
      for (const line of result.lines) {
        expect(line.x).toBe(0);
      }
    });

    it('indent pushes first line', () => {
      const result = layoutText('Hello', 500, 'left', { indent: 20 });
      expect(result.lines[0].x).toBe(20);
    });

    it('leftIndent pushes all lines', () => {
      const result = layoutText('Hello', 500, 'left', { leftIndent: 15 });
      expect(result.lines[0].x).toBe(15);
    });
  });

  // ── Center ────────────────────────────────────────────────────

  describe('center', () => {
    beforeEach(() => { fontMetricsProvider.setMode('browser'); });

    it('single line centered', () => {
      const result = layoutText('Hello', 500, 'center');
      const line = result.lines[0];
      const slack = computeSlack(500, line.width);
      expect(line.x).toBeCloseTo(slack / 2, 1);
    });

    it('short line more shifted than long line', () => {
      const result = layoutText('AAA BBB CCC DDD EEE FFF', 50, 'center');
      expect(result.lines.length).toBeGreaterThan(1);
      const widths = result.lines.map(l => l.width);
      const minWidth = Math.min(...widths);
      const maxWidth = Math.max(...widths);
      const minX = result.lines.find(l => l.width === minWidth)!.x;
      const maxX = result.lines.find(l => l.width === maxWidth)!.x;
      expect(minX).toBeGreaterThanOrEqual(maxX);
    });

    it('multi-line each centered independently', () => {
      const result = layoutText('AAA BBB CCC DDD', 200, 'center');
      for (const line of result.lines) {
        const slack = computeSlack(200, line.width);
        expect(line.x).toBeCloseTo(slack / 2, 1);
      }
    });
  });

  // ── Right ──────────────────────────────────────────────────────

  describe('right', () => {
    beforeEach(() => { fontMetricsProvider.setMode('browser'); });

    it('single line right-aligned', () => {
      const result = layoutText('Hello', 500, 'right');
      const line = result.lines[0];
      const slack = computeSlack(500, line.width);
      expect(line.x).toBeCloseTo(slack, 1);
    });

    it('short line more shifted than long line', () => {
      const result = layoutText('AAA BBB CCC DDD EEE FFF', 50, 'right');
      expect(result.lines.length).toBeGreaterThan(1);
      const widths = result.lines.map(l => l.width);
      const minWidth = Math.min(...widths);
      const maxWidth = Math.max(...widths);
      const minX = result.lines.find(l => l.width === minWidth)!.x;
      const maxX = result.lines.find(l => l.width === maxWidth)!.x;
      expect(minX).toBeGreaterThanOrEqual(maxX);
    });

    it('multi-line each right-aligned independently', () => {
      const result = layoutText('AAA BBB CCC DDD', 200, 'right');
      for (const line of result.lines) {
        const slack = computeSlack(200, line.width);
        expect(line.x).toBeCloseTo(slack, 1);
      }
    });
  });

  // ── Justify ────────────────────────────────────────────────────

  describe('justify', () => {
    beforeEach(() => { fontMetricsProvider.setMode('browser'); });

    it('non-last lines have stretched space fragments', () => {
      const result = layoutText('AAA BBB CCC DDD', 80, 'justify');
      expect(result.lines.length).toBeGreaterThanOrEqual(2);
      // For any non-last line with spaces, width should exceed single space width
      for (let i = 0; i < result.lines.length - 1; i++) {
        const line = result.lines[i];
        const spaceFrags = line.fragments.filter(f => f.type === 'space' && !f.trailing);
        if (spaceFrags.length > 0) {
          expect(spaceFrags[0].width).toBeGreaterThan(8);
        }
      }
    });

    it('last line is start-aligned (not stretched)', () => {
      const result = layoutText('AAA BBB CCC DDD EEE', 100, 'justify');
      expect(result.lines.length).toBeGreaterThanOrEqual(2);
      const lastLine = result.lines[result.lines.length - 1];
      const spaceFrags = lastLine.fragments.filter(f => f.type === 'space' && !f.trailing);
      if (spaceFrags.length > 0) {
        // Last line spaces should NOT be stretched
        expect(spaceFrags[0].width).toBeLessThanOrEqual(10);
      }
    });

    it('single line stays left-aligned (no stretch)', () => {
      const result = layoutText('Hello', 500, 'justify');
      const line = result.lines[0];
      expect(line.x).toBe(0);
    });

    it('no stretchable spaces → left-aligned', () => {
      const result = layoutText('DDDDDD', 500, 'justify');
      expect(result.lines[0].x).toBe(0);
    });
  });

  // ── Multi-run alignment ───────────────────────────────────────

  describe('multi-run', () => {
    beforeEach(() => { fontMetricsProvider.setMode('browser'); });

    it('bold + italic centered', () => {
      const result = layoutMulti([
        { text: 'Normal ', style: { fontSize: 24 }},
        { text: 'Bold', style: { fontWeight: 700, fontSize: 10 } },
        { text: ' Italic', style: { fontStyle: 'italic', fontSize: 24 } },
      ], 200, 'center');
      const line = result.lines[0];
      const slack = computeSlack(200, line.width);
      expect(line.x).toBeCloseTo(slack / 2, 1);
    });

    it('mixed fontSize right-aligned', () => {
      const result = layoutMulti([
        { text: 'Small ', style: { fontSize: 12 } },
        { text: 'BIG', style: { fontSize: 24 } },
      ], 200, 'right');
      const line = result.lines[0];
      const slack = computeSlack(200, line.width);
      expect(line.x).toBeCloseTo(slack, 1);
    });

    it('multi-run justify stretches spaces between runs', () => {
      const result = layoutMulti([
        { text: 'Hello ' },
        { text: 'World ' },
        { text: 'Test' },
      ], 100, 'justify');
      expect(result.lines.length).toBeGreaterThanOrEqual(2);
      // Non-last line: space fragments should be stretched
      for (let i = 0; i < result.lines.length - 1; i++) {
        const line = result.lines[i];
        const spaceFrags = line.fragments.filter(f => f.type === 'space' && !f.trailing);
        if (spaceFrags.length > 0) {
          expect(spaceFrags[0].width).toBeGreaterThan(8);
        }
      }
    });
  });

  // ── Multi-script alignment ────────────────────────────────────

  describe('multi-script', () => {
    beforeEach(() => { fontMetricsProvider.setMode('browser'); });

    it('center alignment with Cyrillic + CJK', () => {
      const result = layoutText('Привет 你好', 200, 'center');
      const line = result.lines[0];
      const slack = computeSlack(200, line.width);
      expect(line.x).toBeCloseTo(slack / 2, 1);
    });

    it('right alignment with Arabic + Latin', () => {
      const result = layoutText('مرحبا Hello', 200, 'right');
      const line = result.lines[0];
      const slack = computeSlack(200, line.width);
      expect(line.x).toBeCloseTo(slack, 1);
    });

    it('justify with multi-script multi-line', () => {
      const result = layoutText('Hello Привет 你好 مرحبا नमस्ते', 100, 'justify');
      expect(result.lines.length).toBeGreaterThanOrEqual(2);
      for (const line of result.lines) {
        assertLineWidthCorrect(line);
      }
    });
  });

  // ── contentWidth ──────────────────────────────────────────────

  describe('contentWidth', () => {
    beforeEach(() => { fontMetricsProvider.setMode('browser'); });

    it('contentWidth is same for left/center/right', () => {
      const left = layoutText('AAA BBB CCC DDD', 200, 'left');
      const center = layoutText('AAA BBB CCC DDD', 200, 'center');
      const right = layoutText('AAA BBB CCC DDD', 200, 'right');
      // contentWidth depends only on fragment widths, not alignment
      expect(center.contentWidth).toBeCloseTo(left.contentWidth, 2);
      expect(right.contentWidth).toBeCloseTo(left.contentWidth, 2);
    });

    it('justify may increase contentWidth (stretched spaces)', () => {
      const left = layoutText('AAA BBB CCC', 100, 'left');
      const justify = layoutText('AAA BBB CCC', 100, 'justify');
      // Justify may have larger contentWidth due to stretched spaces
      expect(justify.contentWidth).toBeGreaterThanOrEqual(left.contentWidth);
    });
  });

  // ── Single-line alignment (nowrap) ──────────────────────────────

  describe('nowrap (single line)', () => {
    beforeEach(() => { fontMetricsProvider.setMode('browser'); });

    /** Layout text with nowrap + alignment, return first line. */
    function nowrapLine(text: string, maxWidth: number, alignment: TextAlignment) {
      const style = { ...DEFAULT_PARAGRAPH_STYLE, alignment, lineHeight: 1.2, whiteSpace: 'nowrap' as const };
      const paragraph = {
        id: 'test-p',
        style,
        children: [{ type: 'text' as const, text, fontFamily: 'Unifont', fontSize: 16, fontWeight: 400, fontStyle: 'normal' as const, color: '#000000' }],
      };
      const result = paragraphLayoutEngine.layout(paragraph, maxWidth);
      return result.lines[0];
    }

    it('left — single line nowrap, x=0', () => {
      const line = nowrapLine('Hello this is left line', 500, 'left');
      expect(line.x).toBe(0);
    });

    it('center — single line nowrap, x=slack/2', () => {
      const line = nowrapLine('Hello this is center line', 500, 'center');
      const slack = computeSlack(500, line.width);
      expect(line.x).toBeCloseTo(slack / 2, 1);
    });

    it('right — single line nowrap, x=slack', () => {
      const line = nowrapLine('Hello this is right line', 500, 'right');
      const slack = computeSlack(500, line.width);
      expect(line.x).toBeCloseTo(slack, 1);
    });

    it('justify — single line nowrap behaves like left (last line rule)', () => {
      const line = nowrapLine('Hello this is justify line', 500, 'justify');
      expect(line.x).toBe(0);
    });

    it('center — multi-run (bold + italic) nowrap', () => {
      const style = { ...DEFAULT_PARAGRAPH_STYLE, alignment: 'center' as const, lineHeight: 1.2, whiteSpace: 'nowrap' as const };
      const paragraph = makeMultiRunParagraph([
        { text: 'Normal ' },
        { text: 'Bold', style: { fontWeight: 700 } },
        { text: ' Italic', style: { fontStyle: 'italic' as const } },
      ]);
      paragraph.style = style;
      const result = paragraphLayoutEngine.layout(paragraph, 500);
      const line = result.lines[0];
      const slack = computeSlack(500, line.width);
      expect(line.x).toBeCloseTo(slack / 2, 1);
    });

    it('right — multi-script (Arabic + Latin) nowrap', () => {
      const line = nowrapLine('مرحبا Hello World', 500, 'right');
      const slack = computeSlack(500, line.width);
      expect(line.x).toBeCloseTo(slack, 1);
    });
  });
});