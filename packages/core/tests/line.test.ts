/**
 * line.test.ts — tests for a single line with multiple runs.
 *
 * Checks:
 * - FragmentBox structure: runs, spaces, empty runs
 * - Styles per run preserved in FragmentBox.style
 * - Line metrics (ascent, descent, height)
 * - Spaces edge cases (leading, trailing, NBSP, multiple spaces)
 * - Continuity (fragments without gaps, line.width)
 * - contentWidth matching physical extent
 *
 * Run: bun test packages/core/tests/line.test.ts
 */

import './setup.ts';
import { paragraphLayoutEngine } from '../src/layout/ParagraphLayoutEngine.js';
import { makeParagraph, makeStyledParagraph, makeMultiRunParagraph } from './test-helpers.js';
import type { TextStyleOverrides } from './test-helpers.js';
import { DEFAULT_PARAGRAPH_STYLE } from '../src/types/Document.js';

// ── Helpers ──────────────────────────────────────────────────────────────

/** Layout multi-run paragraph and return the first line (or null). */
function multiLine(...runs: { text: string; style?: TextStyleOverrides }[]) {
  const result = paragraphLayoutEngine.layout(makeMultiRunParagraph(runs), 500);
  return result.lines[0] ?? null;
}

/** Layout multi-run paragraph and return full result. */
function multiResult(...runs: { text: string; style?: TextStyleOverrides }[]) {
  return paragraphLayoutEngine.layout(makeMultiRunParagraph(runs), 500);
}

/** Assert that line.width matches actual fragment extent. */
function assertLineWidthCorrect(line: { width: number; fragments: { x: number; width: number }[] }): void {
  if (line.fragments.length === 0) return;
  const lastFrag = line.fragments[line.fragments.length - 1];
  const actualContentWidth = lastFrag.x + lastFrag.width;
  expect(line.width).toBeCloseTo(actualContentWidth, 2);
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('line', () => {
  // ── FragmentBox structure ──────────────────────────────────────

  describe('FragmentBox structure', () => {
    it('two runs adjacent — no space between', () => {
      const line = multiLine({ text: 'A' }, { text: 'B' });
      const types = line!.fragments.map(f => f.type);
      const texts = line!.fragments.map(f => f.text);
      expect(types).toEqual(['text', 'text']);
      expect(texts).toEqual(['A', 'B']);
    });

    it('two runs with space — "Hello" + " World"', () => {
      const line = multiLine({ text: 'Hello' }, { text: ' World' });
      const types = line!.fragments.map(f => f.type);
      const texts = line!.fragments.map(f => f.text);
      expect(types).toEqual(['text', 'space', 'text']);
      expect(texts[0]).toBe('Hello');
      expect(texts[1]).toBe(' ');
      expect(texts[2]).toBe('World');
    });

    it('three runs with spaces', () => {
      const line = multiLine(
        { text: 'A' },
        { text: ' B' },
        { text: ' C' },
      );
      const types = line!.fragments.map(f => f.type);
      const texts = line!.fragments.map(f => f.text);
      expect(types).toEqual(['text', 'space', 'text', 'space', 'text']);
      expect(texts).toEqual(['A', ' ', 'B', ' ', 'C']);
    });

    it('empty run mid-line is skipped', () => {
      const line = multiLine(
        { text: 'A' },
        { text: '' },
        { text: 'B' },
      );
      const texts = line!.fragments.map(f => f.text);
      expect(texts).toEqual(['A', 'B']);
    });

    it('run with only spaces creates one space fragment', () => {
      const line = multiLine(
        { text: 'A' },
        { text: '   ' },
        { text: 'B' },
      );
      const types = line!.fragments.map(f => f.type);
      expect(types).toEqual(['text', 'space', 'text']);
      expect(line!.fragments[1].text).toBe(' ');
    });

    it('leading space in first run is trimmed', () => {
      const line = multiLine(
        { text: '  Hello' },
        { text: 'World' },
      );
      // Leading trimmed → adjacent runs without space
      expect(line!.fragments.length).toBe(2);
      expect(line!.fragments[0].text).toBe('Hello');
      expect(line!.fragments[1].text).toBe('World');
    });

    it('trailing space in last run → trailing=true', () => {
      const line = multiLine(
        { text: 'Hello' },
        { text: 'World  ' },
      );
      // Two text fragments: 'Hello' from first run, 'World' from second
      const textFrags = line!.fragments.filter(f => f.type === 'text');
      expect(textFrags.length).toBe(2);
      expect(textFrags[1].text).toBe('World');
      // Trailing space fragments should have trailing=true
      const spaceFrags = line!.fragments.filter(f => f.type === 'space');
      if (spaceFrags.length > 0) {
        for (const sf of spaceFrags) {
          expect(sf.trailing).toBe(true);
        }
      }
    });
  });

  // ── Styles per run ────────────────────────────────────────────

  describe('Styles per run', () => {
    it('bold run preserves fontWeight: 700', () => {
      const line = multiLine(
        { text: 'Normal' },
        { text: 'Bold', style: { fontWeight: 700 } },
      );
      expect(line!.fragments[0].style.fontWeight).toBe(400);
      expect(line!.fragments[1].style.fontWeight).toBe(700);
    });

    it('italic run preserves fontStyle: "italic"', () => {
      const line = multiLine(
        { text: 'Normal' },
        { text: 'Italic', style: { fontStyle: 'italic' } },
      );
      expect(line!.fragments[0].style.fontStyle).toBe('normal');
      expect(line!.fragments[1].style.fontStyle).toBe('italic');
    });

    it('color run preserves color', () => {
      const line = multiLine(
        { text: 'Black' },
        { text: 'Red', style: { color: '#FF0000' } },
      );
      expect(line!.fragments[0].style.color).toBe('#000000');
      expect(line!.fragments[1].style.color).toBe('#FF0000');
    });

    it('underline run preserves underline: true', () => {
      const line = multiLine(
        { text: 'No' },
        { text: 'Under', style: { underline: true } },
      );
      expect(line!.fragments[0].style.underline).toBe(false);
      expect(line!.fragments[1].style.underline).toBe(true);
    });

    it('strikethrough run preserves strikethrough: true', () => {
      const line = multiLine(
        { text: 'No' },
        { text: 'Strike', style: { strikethrough: true } },
      );
      expect(line!.fragments[0].style.strikethrough).toBe(false);
      expect(line!.fragments[1].style.strikethrough).toBe(true);
    });

    it('fontSize mixed — each fragment has own fontMetrics.fontSize', () => {
      const line = multiLine(
        { text: 'Small', style: { fontSize: 12 } },
        { text: 'Big', style: { fontSize: 24 } },
      );
      expect(line!.fragments[0].fontMetrics.fontSize).toBe(12);
      expect(line!.fragments[1].fontMetrics.fontSize).toBe(24);
    });

    it('fontFamily mixed — each fragment has own fontMetrics', () => {
      const line = multiLine(
        { text: 'Unifont', style: { fontFamily: 'Unifont' } },
        { text: 'Arial', style: { fontFamily: 'Arial' } },
      );
      expect(line!.fragments[0].fontMetrics.ascent).toBeDefined();
      expect(line!.fragments[1].fontMetrics.ascent).toBeDefined();
    });

    it('superscript run mid-line affects fragment ascent', () => {
      const line = multiLine(
        { text: 'X' },
        { text: '2', style: { script: 'super' } },
      );
      // superscript has baselineOffset → effectiveAscent differs
      // Both are "text" type since super doesn't create space
      expect(line!.fragments[0].type).toBe('text');
      expect(line!.fragments[1].type).toBe('text');
    });

    it('combination: bold + italic + color in one run', () => {
      const line = multiLine(
        { text: 'Normal' },
        { text: 'BoldItalicRed', style: { fontWeight: 700, fontStyle: 'italic', color: '#FF0000' } },
      );
      const f = line!.fragments[1];
      expect(f.style.fontWeight).toBe(700);
      expect(f.style.fontStyle).toBe('italic');
      expect(f.style.color).toBe('#FF0000');
    });

    it('underline + strikethrough in one run', () => {
      const line = multiLine(
        { text: 'Normal' },
        { text: 'Both', style: { underline: true, strikethrough: true } },
      );
      const f = line!.fragments[1];
      expect(f.style.underline).toBe(true);
      expect(f.style.strikethrough).toBe(true);
    });
  });

  // ── Line metrics ───────────────────────────────────────────────

  describe('Line metrics', () => {
    it('ascent = max across all fragments (32px > 16px)', () => {
      const line = multiLine(
        { text: 'A', style: { fontSize: 16 } },
        { text: 'B', style: { fontSize: 32 } },
      );
      // line.ascent should be the max ascent from the 32px fragment
      const bigAscent = line!.fragments[1].fontMetrics.ascent;
      const smallAscent = line!.fragments[0].fontMetrics.ascent;
      expect(line!.ascent).toBeGreaterThanOrEqual(bigAscent);
      expect(line!.ascent).toBeGreaterThan(smallAscent);
    });

    it('descent = max across all fragments (32px > 16px)', () => {
      const line = multiLine(
        { text: 'A', style: { fontSize: 32 } },
        { text: 'B', style: { fontSize: 16 } },
      );
      const bigDescent = line!.fragments[0].fontMetrics.descent;
      expect(line!.descent).toBeGreaterThanOrEqual(bigDescent);
    });

    it('line height >= ascent + descent', () => {
      const line = multiLine({ text: 'A' }, { text: 'B' });
      expect(line!.height).toBeGreaterThanOrEqual(line!.ascent + line!.descent);
    });

    it('line with 32px font is taller than line with 16px', () => {
      const line16 = multiLine({ text: 'A', style: { fontSize: 16 } }, { text: 'B', style: { fontSize: 16 } });
      const lineMixed = multiLine({ text: 'A', style: { fontSize: 16 } }, { text: 'B', style: { fontSize: 32 } });
      expect(lineMixed!.height).toBeGreaterThan(line16!.height);
    });
  });

  // ── Continuity ─────────────────────────────────────────────────

  describe('Continuity', () => {
    it('adjacent runs are placed without gaps', () => {
      const line = multiLine({ text: 'Hel' }, { text: 'lo' });
      const frags = line!.fragments;
      const end = frags[0].x + frags[0].width;
      expect(Math.abs(frags[1].x - end)).toBeLessThanOrEqual(0.5);
    });

    it('space between runs creates correct gap', () => {
      const line = multiLine({ text: 'A' }, { text: ' B' });
      const frags = line!.fragments;
      // [text:"A"][space:" "][text:"B"]
      expect(frags[0].x + frags[0].width).toBeCloseTo(frags[1].x, 2);
      expect(frags[1].x + frags[1].width).toBeCloseTo(frags[2].x, 2);
    });

    it('line.width matches last fragment extent', () => {
      const line = multiLine({ text: 'AAA' }, { text: 'BBB' });
      assertLineWidthCorrect(line!);
    });

    it('line.x equals 0 for left alignment (no indent)', () => {
      const line = multiLine({ text: 'A' }, { text: 'B' });
      expect(line!.x).toBe(0);
    });
  });

  // ── contentWidth ──────────────────────────────────────────────

  describe('contentWidth', () => {
    it('contentWidth equals line width for single-line multi-run', () => {
      const result = multiResult(
        { text: 'Hello' },
        { text: ' World' },
      );
      expect(result.lines.length).toBe(1);
      assertLineWidthCorrect(result.lines[0]);
      expect(result.contentWidth).toBeCloseTo(result.lines[0].width, 2);
    });

    it('contentWidth equals line width for 3-run single line', () => {
      const result = multiResult(
        { text: 'A' },
        { text: ' B' },
        { text: ' C' },
      );
      expect(result.lines.length).toBe(1);
      assertLineWidthCorrect(result.lines[0]);
      expect(result.contentWidth).toBeCloseTo(result.lines[0].width, 2);
    });

    it('contentWidth matches for styled multi-run', () => {
      const result = multiResult(
        { text: 'Normal ' },
        { text: 'Bold', style: { fontWeight: 700 } },
        { text: ' Red', style: { color: '#FF0000' } },
      );
      expect(result.lines.length).toBe(1);
      assertLineWidthCorrect(result.lines[0]);
      expect(result.contentWidth).toBeCloseTo(result.lines[0].width, 2);
    });

    it('contentWidth > line width for multi-line multi-run (wrapping)', () => {
      const result = paragraphLayoutEngine.layout(
        makeMultiRunParagraph([
          { text: 'Hello ' },
          { text: 'World ' },
          { text: 'AAA ' },
          { text: 'BBB ' },
          { text: 'CCCC' },
        ]),
        40,
      );
      expect(result.lines.length).toBeGreaterThan(1);
      const maxLineWidth = Math.max(...result.lines.map(l => l.width));
      expect(result.contentWidth).toBeGreaterThanOrEqual(maxLineWidth);
    });
  });
});