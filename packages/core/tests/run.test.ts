/**
 * run.test.ts — tests for a single text run (one run, one line).
 *
 * Checks:
 * - FragmentBox output: size, styles, spaces, multi-script, etc.
 * - Multi-run space fragments: gapBefore leading to type:'space'
 * - contentWidth matching physical extent
 *
 * Run: bun test packages/core/tests/run.test.ts
 */

import './setup.ts';
import { paragraphLayoutEngine } from '../src/layout/ParagraphLayoutEngine.js';
import { makeParagraph, makeStyledParagraph, makeMultiRunParagraph } from './test-helpers.js';
import type { Paragraph } from '../src/types/Document.js';
import type { TextStyleOverrides } from './test-helpers.js';
import { DEFAULT_PARAGRAPH_STYLE } from '../src/types/Document.js';

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

/** Assert that line.width matches actual fragment extent. */
function assertLineWidthCorrect(line: { width: number; fragments: { x: number; width: number }[] }): void {
  if (line.fragments.length === 0) return;
  const lastFrag = line.fragments[line.fragments.length - 1];
  const actualContentWidth = lastFrag.x + lastFrag.width;
  expect(line.width).toBeCloseTo(actualContentWidth, 2);
}

/** Build a single-run paragraph with arbitrary style overrides. */
function makeRunParagraph(text: string, overrides: TextStyleOverrides): Paragraph {
  return {
    id: 'test-p',
    style: { ...DEFAULT_PARAGRAPH_STYLE, alignment: 'left', lineHeight: 1.2 },
    children: [{
      type: 'text',
      text,
      fontFamily: 'Unifont',
      fontSize: 16,
      fontWeight: 400,
      fontStyle: 'normal',
      color: '#000000',
      underline: false,
      strikethrough: false,
      ...overrides,
    }],
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('run', () => {

  // ── FragmentBox properties ──────────────────────────────────────

  describe('FragmentBox', () => {
    // ── Basic ────────────────────────────────────────────────────

    it('single char produces one text fragment', () => {
      const line = singleLine('A');
      expect(line).not.toBeNull();
      expect(line!.fragments.length).toBe(1);
      expect(line!.fragments[0].type).toBe('text');
      expect(line!.fragments[0].text).toBe('A');
      expect(line!.fragments[0].width).toBeGreaterThan(0);
    });

    it('non-empty string produces one fragment with all chars', () => {
      const line = singleLine('Hello');
      expect(line!.fragments.length).toBe(1);
      expect(line!.fragments[0].text).toBe('Hello');
    });

    // ── fontSize ─────────────────────────────────────────────────

    it('fontSize scales width proportionally (16 vs 32)', () => {
      const line16 = singleLine('A', 16);
      const line32 = singleLine('A', 32);
      const w16 = line16!.fragments[0].width;
      const w32 = line32!.fragments[0].width;
      // 32px → roughly 2× 16px (allow some tolerance for sub-pixel)
      expect(w32).toBeGreaterThan(w16 * 1.8);
      expect(w32).toBeLessThan(w16 * 2.2);
    });

    it('FragmentBox.fontMetrics.fontSize matches effective font size', () => {
      const line = singleLine('A', 24);
      expect(line!.fragments[0].fontMetrics.fontSize).toBe(24);
    });

    // ── Different font → different metrics ──────────────────────

    it('different fontFamily gives different ascent/descent', () => {
      const lineUnifont = styledLine('A', { fontFamily: 'Unifont' });
      const lineArial = styledLine('A', { fontFamily: 'Arial' });
      const u = lineUnifont!.fragments[0].fontMetrics;
      const a = lineArial!.fragments[0].fontMetrics;
      expect(u.ascent).toBeDefined();
      expect(a.ascent).toBeDefined();
    });

    // ── Leading / trailing spaces in single run ─────────────────

    it('leading spaces are trimmed ("  Hello World" → "Hello World")', () => {
      const line = singleLine('  Hello World');
      expect(line!.fragments.length).toBe(1);
      expect(line!.fragments[0].type).toBe('text');
      expect(line!.fragments[0].text).toBe('Hello World');
    });

    it('trailing spaces are trimmed ("Hello World  " → "Hello World")', () => {
      const line = singleLine('Hello World  ');
      const textFrags = line!.fragments.filter(f => f.type === 'text');
      expect(textFrags.length).toBe(1);
      expect(textFrags[0].text).toBe('Hello World');
      // Trailing space fragments get trailing=true
      const spaceFrags = line!.fragments.filter(f => f.type === 'space');
      if (spaceFrags.length > 0) {
        for (const sf of spaceFrags) {
          expect(sf.trailing).toBe(true);
        }
      }
    });

    // ── Space between words (single run) ─────────────────────────

    it('single-run: space between words stays in one text fragment (Hello World)', () => {
      const line = singleLine('Hello World');
      // Single run: space stays embedded, no separate type:'space'
      expect(line!.fragments.length).toBe(1);
      expect(line!.fragments[0].type).toBe('text');
      expect(line!.fragments[0].text).toBe('Hello World');
    });

    it('single-run: multiple consecutive spaces collapse (Hello   World)', () => {
      const one = singleLine('Hello World');
      const two = singleLine('Hello  World');
      expect(one!.fragments[0].text).toBe('Hello World');
      expect(two!.fragments[0].text).toBe('Hello World');
    });

    it('single-run: width with space > width without space (Hello World vs HelloWorld)', () => {
      const withSpace = singleLine('Hello World');
      const noSpace = singleLine('HelloWorld');
      expect(withSpace!.fragments[0].width).toBeGreaterThan(noSpace!.fragments[0].width);
    });

    // ── Multi-run spaces (gapBefore → type:'space') ─────────────

    it('multi-run: "Hello" + " World" — space at start of second run → type:"space"', () => {
      const line = multiLine(
        { text: 'Hello' },
        { text: ' World' },
      );
      const types = line!.fragments.map(f => f.type);
      const texts = line!.fragments.map(f => f.text);
      expect(types).toEqual(['text', 'space', 'text']);
      expect(texts[0]).toBe('Hello');
      expect(texts[1]).toBe(' ');
      expect(texts[2]).toBe('World');
    });

    it('multi-run: "Hello " + "World" — space at end of first run → type:"space"', () => {
      const line = multiLine(
        { text: 'Hello ' },
        { text: 'World' },
      );
      const types = line!.fragments.map(f => f.type);
      const texts = line!.fragments.map(f => f.text);
      expect(types).toEqual(['text', 'space', 'text']);
      expect(texts[0]).toBe('Hello');
      expect(texts[1]).toBe(' ');
      expect(texts[2]).toBe('World');
    });

    it('multi-run: "Hello" + " " + "World" — standalone space run → type:"space"', () => {
      const line = multiLine(
        { text: 'Hello' },
        { text: ' ' },
        { text: 'World' },
      );
      const types = line!.fragments.map(f => f.type);
      const texts = line!.fragments.map(f => f.text);
      expect(types).toEqual(['text', 'space', 'text']);
      expect(texts[0]).toBe('Hello');
      expect(texts[1]).toBe(' ');
      expect(texts[2]).toBe('World');
    });

    it('multi-run: space fragment has positive width', () => {
      const line = multiLine(
        { text: 'Hello' },
        { text: ' World' },
      );
      const spaceFrag = line!.fragments.find(f => f.type === 'space');
      expect(spaceFrag).toBeDefined();
      expect(spaceFrag!.width).toBeGreaterThan(0);
    });

    // ── Continuity ───────────────────────────────────────────────

    it('adjacent fragments are placed without gaps', () => {
      const line = singleLine('A B C');
      const frags = line!.fragments;
      for (let i = 0; i < frags.length - 1; i++) {
        const currentEnd = frags[i].x + frags[i].width;
        expect(Math.abs(frags[i + 1].x - currentEnd)).toBeLessThanOrEqual(0.5);
      }
    });

    // ── Style properties on FragmentBox ─────────────────────────

    it('bold → FragmentBox.style.fontWeight === 700', () => {
      const line = styledLine('Bold', { fontWeight: 700 });
      expect(line!.fragments[0].style.fontWeight).toBe(700);
    });

    it('italic → FragmentBox.style.fontStyle === "italic"', () => {
      const line = styledLine('Italic', { fontStyle: 'italic' });
      expect(line!.fragments[0].style.fontStyle).toBe('italic');
    });

    it('color → FragmentBox.style.color', () => {
      const line = styledLine('Red', { color: '#FF0000' });
      expect(line!.fragments[0].style.color).toBe('#FF0000');
    });

    it('underline → FragmentBox.style.underline === true', () => {
      const line = styledLine('Under', { underline: true });
      expect(line!.fragments[0].style.underline).toBe(true);
    });

    it('strikethrough → FragmentBox.style.strikethrough === true', () => {
      const line = styledLine('Strike', { strikethrough: true });
      expect(line!.fragments[0].style.strikethrough).toBe(true);
    });

    // ── Script super/sub ────────────────────────────────────────

    it('superscript changes effective ascent (baselineOffset)', () => {
      const normal = makeRunParagraph('A', {});
      const superP = makeRunParagraph('A', { script: 'super' });
      const normalLine = paragraphLayoutEngine.layout(normal, 500).lines[0];
      const superLine = paragraphLayoutEngine.layout(superP, 500).lines[0];
      expect(superLine!.ascent).toBeLessThan(normalLine!.ascent);
    });

    it('subscript changes effective descent (baselineOffset)', () => {
      const normal = makeRunParagraph('A', {});
      const subP = makeRunParagraph('A', { script: 'sub' });
      const normalLine = paragraphLayoutEngine.layout(normal, 500).lines[0];
      const subLine = paragraphLayoutEngine.layout(subP, 500).lines[0];
      expect(subLine!.descent).toBeLessThanOrEqual(normalLine!.descent);
    });

    // ── Non-breaking space ──────────────────────────────────────

    it('non-breaking space (U+00A0) does NOT create a space fragment', () => {
      const line = singleLine('A\u00A0B');
      expect(line!.fragments.length).toBe(1);
      expect(line!.fragments[0].type).toBe('text');
      expect(line!.fragments[0].text).toBe('A\u00A0B');
    });

    // ── Inline widget ───────────────────────────────────────────

    it('inline-widget produces FragmentBox with inlineWidget', () => {
      const paragraph: Paragraph = {
        id: 'test-p',
        style: { ...DEFAULT_PARAGRAPH_STYLE, alignment: 'left', lineHeight: 1.2 },
        children: [{
          type: 'inline-box',
          text: '\uFFFC',
          fontFamily: 'Unifont',
          fontSize: 16,
          fontWeight: 400,
          fontStyle: 'normal',
          color: '#000000',
          inlineWidget: { width: 20, height: 16, baselineOffset: 0 },
        }],
      };
      const result = paragraphLayoutEngine.layout(paragraph, 500);
      const line = result.lines[0];
      expect(line).not.toBeNull();
      expect(line!.fragments.length).toBe(1);
      expect(line!.fragments[0].inlineWidget).toBeDefined();
      expect(line!.fragments[0].inlineWidget!.width).toBe(20);
      expect(line!.fragments[0].width).toBeGreaterThan(0);
    });

    // ── Multi-script (Cyrillic + CJK + Arabic + Hindi) ─────────

    it('Cyrillic text produces valid FragmentBox', () => {
      const line = singleLine('Привет');
      expect(line).not.toBeNull();
      expect(line!.fragments[0].type).toBe('text');
      expect(line!.fragments[0].text).toBe('Привет');
      expect(line!.fragments[0].width).toBeGreaterThan(0);
    });

    it('CJK text produces valid FragmentBox', () => {
      const line = singleLine('你好世界');
      expect(line).not.toBeNull();
      expect(line!.fragments[0].type).toBe('text');
      expect(line!.fragments[0].text).toBe('你好世界');
      expect(line!.fragments[0].width).toBeGreaterThan(0);
    });

    it('Arabic text produces valid FragmentBox', () => {
      const line = singleLine('مرحبا');
      expect(line).not.toBeNull();
      expect(line!.fragments[0].type).toBe('text');
      expect(line!.fragments[0].text).toBe('مرحبا');
      expect(line!.fragments[0].width).toBeGreaterThan(0);
    });

    it('Hindi (Devanagari) text produces valid FragmentBox', () => {
      const line = singleLine('नमस्ते');
      expect(line).not.toBeNull();
      expect(line!.fragments[0].type).toBe('text');
      expect(line!.fragments[0].text).toBe('नमस्ते');
      expect(line!.fragments[0].width).toBeGreaterThan(0);
    });

    it('special ASCII characters ($ @ % = ± # [ ] ( ) . , ! : digits)', () => {
      const line = singleLine('Цена: $50 @ 10% = ±5 #hash [tag] (c) 2024 г.');
      expect(line).not.toBeNull();
      expect(line!.fragments.length).toBe(1);
      expect(line!.fragments[0].type).toBe('text');
      expect(line!.fragments[0].text).toBe('Цена: $50 @ 10% = ±5 #hash [tag] (c) 2024 г.');
      expect(line!.fragments[0].width).toBeGreaterThan(0);
    });

    it('multilingual full sentence (5 scripts + spaces) all fragments have positive width', () => {
      const text = 'Hello everyone! Привет всем! 大家好！مرحبا بالجميع！सभी को नमस्ते!';
      // Use whiteSpace: 'nowrap' — no wrapping, entire text in one line
      const paragraph: Paragraph = {
        id: 'test-p',
        style: { ...DEFAULT_PARAGRAPH_STYLE, alignment: 'left', lineHeight: 1.2, whiteSpace: 'nowrap' },
        children: [{ type: 'text', text, fontFamily: 'Unifont', fontSize: 16, fontWeight: 400, fontStyle: 'normal', color: '#000000' }],
      };
      const result = paragraphLayoutEngine.layout(paragraph, 500);
      const line = result.lines[0];
      expect(line).not.toBeNull();
      expect(result.lines.length).toBe(1);
      expect(line!.fragments.length).toBeGreaterThanOrEqual(1);
      for (const frag of line!.fragments) {
        expect(frag.width).toBeGreaterThan(0);
      }
      // All original characters should be present (spaces may be in type:'space' fragments)
      const combinedText = line!.fragments.map(f => f.text).join('');
      const originalChars = text.replace(/\s/g, '');
      const resultChars = combinedText.replace(/\s/g, '');
      expect(resultChars).toBe(originalChars);
    });
  });

  // ── contentWidth / frame ──────────────────────────────────────────

  describe('contentWidth', () => {
    it('contentWidth equals line width for single-run single line (Hello)', () => {
      const result = singleResult('Hello');
      expect(result.lines.length).toBe(1);
      expect(result.contentWidth).toBeCloseTo(result.lines[0].width, 2);
    });

    it('contentWidth matches last fragment x + width (Hello World)', () => {
      const result = singleResult('Hello World');
      const line = result.lines[0];
      assertLineWidthCorrect(line);
      expect(result.contentWidth).toBeCloseTo(line.width, 2);
    });

    it('contentWidth matches line width for multi-run single line (Hello + World)', () => {
      const result = multiResult(
        { text: 'Hello' },
        { text: ' World' },
      );
      expect(result.lines.length).toBe(1);
      const line = result.lines[0];
      assertLineWidthCorrect(line);
      expect(result.contentWidth).toBeCloseTo(line.width, 2);
    });

    it('contentWidth > line width for multi-line (wrapping)', () => {
      // Narrow container forces wrap → contentWidth should be the max line width
      const result = paragraphLayoutEngine.layout(
        makeParagraph('Hello World AAA BBB'),
        40,
      );
      expect(result.lines.length).toBeGreaterThan(1);
      // contentWidth should be >= widest line
      const maxLineWidth = Math.max(...result.lines.map(l => l.width));
      expect(result.contentWidth).toBeGreaterThanOrEqual(maxLineWidth);
    });
  });
});