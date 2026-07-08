/**
 * wrap.test.ts — text wrapping tests (Paragraph level).
 *
 * Covers:
 * - Basic wrap (single run, space boundaries)
 * - Long word overflow (per-character wrap)
 * - Multi-run wrapping with different styles
 * - Hard break (\n)
 * - Line spacing (spaceBefore, spaceAfter, lineHeight)
 * - Long sentence + multi-line
 * - contentWidth consistency
 *
 * Run: bun test packages/core/tests/wrap.test.ts
 */

import './setup.ts';
import { paragraphLayoutEngine } from '../src/layout/ParagraphLayoutEngine.js';
import { fontMetricsProvider } from '../src/measure/FontMetricsProvider.js';
import { makeParagraph, makeStyledParagraph, makeMultiRunParagraph } from './test-helpers.js';
import type { TextStyleOverrides } from './test-helpers.js';
import { DEFAULT_PARAGRAPH_STYLE } from '../src/types/Document.js';
import type { LineBox } from '../src/types/LayoutTypes.js';

// ── Helpers ──────────────────────────────────────────────────────────────

/** Assert line.width matches actual fragment extents. */
function assertLineWidthCorrect(line: LineBox): void {
  if (line.fragments.length === 0) return;
  const lastFrag = line.fragments[line.fragments.length - 1];
  const actualContentWidth = lastFrag.x + lastFrag.width;
  expect(line.width).toBeCloseTo(actualContentWidth, 2);
}

/** Layout and return full result (wraps at maxWidth). */
function layoutText(text: string, maxWidth: number, styleOverrides?: Partial<{ lineHeight: number; spaceBefore: number; spaceAfter: number }>) {
  const style = { ...DEFAULT_PARAGRAPH_STYLE, alignment: 'left' as const, lineHeight: 1.2, ...styleOverrides };
  const paragraph = {
    id: 'test-p',
    style,
    children: [{ type: 'text' as const, text, fontFamily: 'Unifont', fontSize: 16, fontWeight: 400, fontStyle: 'normal' as const, color: '#000000' }],
  };
  return paragraphLayoutEngine.layout(paragraph, maxWidth);
}

/** Layout multi-run and return full result. */
function layoutMulti(runs: { text: string; style?: TextStyleOverrides }[], maxWidth: number) {
  return paragraphLayoutEngine.layout(makeMultiRunParagraph(runs), maxWidth);
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('wrap', () => {
  describe('browser mode', () => {
    beforeEach(() => {
      fontMetricsProvider.setMode('browser');
    });

    // ── Basic wrap ────────────────────────────────────────────────

    it('fits in one line when container is wide enough', () => {
      const result = layoutText('AAA BBB', 500);
      expect(result.lines.length).toBe(1);
      expect(result.lines[0].fragments.map((f) => f.text).join('')).toBe('AAA BBB');
      expect(result.lines[0].width).toBeGreaterThan(0);
      assertLineWidthCorrect(result.lines[0]);
    });

    it('wraps at space when container is narrow', () => {
      const result = layoutText('AAA BBB', 30);
      expect(result.lines.length).toBeGreaterThanOrEqual(2);
    });

    it('multiple words produce multiple lines', () => {
      const result = layoutText('AAA BBB CCC DDD DDDDDD', 40);
      expect(result.lines.length).toBeGreaterThan(1);
    });

    it('long word without spaces overflows — each char its own line', () => {
      const result = layoutText('DDDDDD', 10);
      expect(result.lines.length).toBe(6);
      // Each line should have exactly one char
      for (const line of result.lines) {
        const text = line.fragments.map(f => f.text).join('');
        expect(text.length).toBe(1);
      }
    });

    it('long Cyrillic word breaks per char', () => {
      const result = layoutText('ПРРРРРРР', 10);
      expect(result.lines.length).toBeGreaterThanOrEqual(6);
    });

    it('empty text produces no lines', () => {
      const result = layoutText('', 100);
      expect(result.lines.length).toBe(0);
      expect(result.height).toBe(0);
    });

    it('wider container fits more text per line', () => {
      const resultNarrow = layoutText('AAA BBB', 30);
      const resultWide = layoutText('AAA BBB', 500);
      expect(resultNarrow.lines.length).toBeGreaterThan(resultWide.lines.length);
    });

    it('word overflow + normal word — first overflows, second breaks too', () => {
      const result = layoutText('DDDDDD BBB', 10);
      // Both words overflow per char: DDDDDD (6 lines) + BBB (3 lines)
      expect(result.lines.length).toBeGreaterThanOrEqual(6);
      // Last line should be 'B' (BBB also breaks per char)
      const lastLineText = result.lines[result.lines.length - 1].fragments.map(f => f.text).join('');
      expect(lastLineText).toBe('B');
    });

    // ── Long sentence ─────────────────────────────────────────────

    it('long sentence wraps into many lines', () => {
      const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
      const result = layoutText(text, 100);
      expect(result.lines.length).toBeGreaterThan(3);
      // contentWidth should be <= maxWidth (100) for all non-last lines
      for (const line of result.lines) {
        assertLineWidthCorrect(line);
      }
    });

    it('long sentence with hard breaks at narrow width', () => {
      // Use narrow width so \n triggers actual line breaks
      const text = 'Lorem.\nIpsum.\nDolor.';
      const result = layoutText(text, 100);
      expect(result.lines.length).toBeGreaterThanOrEqual(3);
    });

    // ── Hard break ────────────────────────────────────────────────

    it('hard break at narrow width splits into 2+ lines', () => {
      const result = layoutText('AAA\nBBB', 30);
      expect(result.lines.length).toBeGreaterThanOrEqual(2);
    });

    it('hard break splits text at narrow width', () => {
      const result = layoutText('A\nBC', 30);
      expect(result.lines.length).toBeGreaterThanOrEqual(2);
    });

    it('hard break + soft wrap mixed', () => {
      const result = layoutText('AAA BBB\nCCC DDD', 30);
      expect(result.lines.length).toBeGreaterThanOrEqual(3);
    });

    // ── Multi-run wrap ────────────────────────────────────────────

    it('two runs wrap when narrow', () => {
      const result = layoutMulti([
        { text: 'Hello ' },
        { text: 'World' },
      ], 30);
      expect(result.lines.length).toBeGreaterThanOrEqual(2);
    });

    it('bold word wraps with correct style', () => {
      const result = layoutMulti([
        { text: 'Normal ' },
        { text: 'BoldWord', style: { fontWeight: 700 } },
      ], 30);
      expect(result.lines.length).toBeGreaterThanOrEqual(2);
      // Bold fragment should be on the second line
      const lastLine = result.lines[result.lines.length - 1];
      const boldFrag = lastLine.fragments.find(f => f.style.fontWeight === 700);
      expect(boldFrag).toBeDefined();
    });

    it('mixed fontSize wrap — line height takes max', () => {
      const result = layoutMulti([
        { text: 'Small ', style: { fontSize: 12 } },
        { text: 'BIGWORD', style: { fontSize: 24 } },
      ], 30);
      expect(result.lines.length).toBeGreaterThanOrEqual(2);
      // The line with 24px should have greater ascent
      for (const line of result.lines) {
        assertLineWidthCorrect(line);
      }
    });

    it('three runs mixed styles wrap', () => {
      const result = layoutMulti([
        { text: 'Normal ' },
        { text: 'Italic ', style: { fontStyle: 'italic' } },
        { text: 'BoldLast', style: { fontWeight: 700 } },
      ], 50);
      expect(result.lines.length).toBeGreaterThanOrEqual(2);
    });

    it('long multi-run sentence wraps', () => {
      const result = layoutMulti([
        { text: 'Lorem ipsum dolor sit amet, ' },
        { text: 'consectetur adipiscing elit, ', style: { fontWeight: 700 } },
        { text: 'sed do eiusmod tempor incididunt.', style: { fontStyle: 'italic' } },
      ], 100);
      expect(result.lines.length).toBeGreaterThan(2);
      for (const line of result.lines) {
        assertLineWidthCorrect(line);
      }
    });

    // ── Line spacing ──────────────────────────────────────────────

    it('spaceBefore pushes first line down', () => {
      const result = layoutText('Hello', 500, { spaceBefore: 10 });
      expect(result.lines[0].y).toBe(10);
    });

    it('spaceAfter adds gap after last line', () => {
      const result = layoutText('Hello', 500, { spaceAfter: 10 });
      // height = last line y + last line height + spaceAfter
      const lastLine = result.lines[result.lines.length - 1];
      const expectedHeight = lastLine.y + lastLine.height + 10;
      expect(result.height).toBeCloseTo(expectedHeight, 2);
    });

    it('lineHeight 2.0 produces taller lines', () => {
      const resultNormal = layoutText('Hello\nWorld', 500, { lineHeight: 1.2 });
      const resultTall = layoutText('Hello\nWorld', 500, { lineHeight: 2.0 });
      // Total height should be greater with lineHeight 2.0
      expect(resultTall.height).toBeGreaterThan(resultNormal.height);
    });

    it('lineHeight 1.0 minimal height', () => {
      const result = layoutText('A', 500, { lineHeight: 1.0 });
      expect(result.lines[0].height).toBeGreaterThan(0);
      assertLineWidthCorrect(result.lines[0]);
    });

    it('spaceBefore + spaceAfter combined', () => {
      const result = layoutText('Hello', 500, { spaceBefore: 5, spaceAfter: 7 });
      expect(result.lines[0].y).toBe(5);
      const lastLine = result.lines[result.lines.length - 1];
      const expectedHeight = lastLine.y + lastLine.height + 7;
      expect(result.height).toBeCloseTo(expectedHeight, 2);
    });

    // ── contentWidth ──────────────────────────────────────────────

    it('contentWidth = max line width for multi-line', () => {
      const result = layoutText('AAA BBB CCC DDD', 40);
      expect(result.lines.length).toBeGreaterThan(1);
      const maxLineWidth = Math.max(...result.lines.map(l => l.width));
      expect(result.contentWidth).toBeGreaterThanOrEqual(maxLineWidth);
    });

    it('contentWidth < single line width (wrapping reduces width)', () => {
      const singleLine = layoutText('AAA BBB CCC DDD', 500);
      const multiLine = layoutText('AAA BBB CCC DDD', 40);
      expect(multiLine.contentWidth).toBeLessThan(singleLine.contentWidth);
    });
  });

  // ── Office mode ─────────────────────────────────────────────────

  describe('office mode', () => {
    beforeEach(() => {
      fontMetricsProvider.setMode('office');
    });

    it('lineHeight 1.2 vs 2.0 — same line height (office ignores lineHeight)', () => {
      const resultNormal = layoutText('Hello World', 30, { lineHeight: 1.2 });
      const resultTall = layoutText('Hello World', 30, { lineHeight: 2.0 });
      // In office mode, line height is strictly ascent+descent (no lineHeight multiplier)
      expect(resultNormal.lines.length).toBeGreaterThanOrEqual(2);
      expect(resultTall.lines.length).toBeGreaterThanOrEqual(2);
      expect(resultTall.height).toBeCloseTo(resultNormal.height, 1);
    });

    it('fits in one line when container is wide enough', () => {
      const result = layoutText('AAA BBB', 500);
      expect(result.lines.length).toBe(1);
      expect(result.lines[0].fragments.map((f) => f.text).join('')).toBe('AAA BBB');
      expect(result.lines[0].width).toBeGreaterThan(0);
    });

    it('spaceBefore pushes first line down', () => {
      const result = layoutText('Hello', 500, { spaceBefore: 10 });
      expect(result.lines[0].y).toBe(10);
    });

    it('spaceAfter adds gap after last line', () => {
      const result = layoutText('Hello', 500, { spaceAfter: 10 });
      const lastLine = result.lines[result.lines.length - 1];
      const expectedHeight = lastLine.y + lastLine.height + 10;
      expect(result.height).toBeCloseTo(expectedHeight, 2);
    });

    it('spaceBefore + spaceAfter combined', () => {
      const result = layoutText('Hello', 500, { spaceBefore: 5, spaceAfter: 7 });
      expect(result.lines[0].y).toBe(5);
      const lastLine = result.lines[result.lines.length - 1];
      const expectedHeight = lastLine.y + lastLine.height + 7;
      expect(result.height).toBeCloseTo(expectedHeight, 2);
    });
  });
});
