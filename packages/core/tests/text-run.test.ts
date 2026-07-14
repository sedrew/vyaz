/**
 * text-run.test.ts — comprehensive TextRun property tests.
 *
 * Covers all 19 sections:
 *   1. TextRun.type: 'text'
 *   2. TextRun.type: 'inline-box'
 *   3. TextRun.fontFamily
 *   4. TextRun.fontSize
 *   5. TextRun.fontWeight
 *   6. TextRun.fontStyle
 *   7. TextRun.color
 *   8. TextRun.backgroundColor
 *   9. TextRun.letterSpacing
 *  10. TextRun.script: 'super' / 'sub'
 *  11. TextRun.underline
 *  12. TextRun.strikethrough
 *  13. TextRun.overline
 *  14. Multi-run styling
 *  15. Span.trailing
 *  16. Span.breakType
 *  17. Span.glyphAdvances
 *  18. ParagraphLayoutResult.contentWidth
 *  19. Invariants (assertLineInvariants)
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { spyOn } from 'bun:test';
import {
  engine,
  registerUnifont,
  registerArialVariants,
  hasCanvas,
  makeParagraph,
  makeStyledParagraph,
  makeMultiRunParagraph,
  layoutParagraph,
  layoutGlyphParagraph,
  allSpans,
  allTextSpans,
  allSpaceSpans,
  spanTexts,
  lastSpan,
} from './helpers.ts';
import { FontNotFoundError } from '../src/measure/FontNotFoundError.js';
import { compileParagraph } from '../src/compile/DocumentCompiler.js';

beforeAll(async () => {
  await registerUnifont();
  await registerArialVariants();
});

// ── 1. TextRun.type: 'text' ──────────────────────────────────────────────

describe('TextRun.type: "text"', () => {
  test('type: "text" → Span has type: "text"', () => {
    const result = layoutParagraph(makeParagraph('Hello'));
    const spans = allTextSpans(result);
    expect(spans.length).toBeGreaterThan(0);
    for (const s of spans) expect(s.type).toBe('text');
  });

  test('text content correctly maps to Span.text', () => {
    const result = layoutParagraph(makeParagraph('Hello'));
    const texts = allTextSpans(result).map((s) => s.text);
    expect(texts.join('')).toContain('Hello');
  });

  test('non-breaking space (U+00A0) does NOT create a separate space span', () => {
    const result = layoutParagraph(makeParagraph('Hello\u00A0World'));
    const spaces = allSpaceSpans(result);
    const texts = allTextSpans(result).map((s) => s.text);
    const combined = texts.join('');
    expect(combined).toContain('\u00A0');
    for (const s of spaces) expect(s.text).not.toBe('\u00A0');
  });

  test('leading spaces are trimmed (in whiteSpace: "normal" mode)', () => {
    const result = layoutParagraph(makeParagraph('   Hello'));
    const texts = allTextSpans(result).map((s) => s.text);
    const combined = texts.join('');
    expect(combined.trim()).toBe('Hello');
  });

  test('trailing spaces are trimmed — no extra fragments in whiteSpace:normal', () => {
    const result = layoutParagraph(makeParagraph('Hello   '));
    const textSpans = allTextSpans(result);
    expect(textSpans.length).toBeGreaterThan(0);
    expect(textSpans[0].text).toBe('Hello');
  });

  test('multiple spaces inside a run stay in one text span', () => {
    const result = layoutParagraph(makeParagraph('Hello    World'));
    const textSpans = allTextSpans(result).map((s) => s.text);
    const combined = textSpans.join('');
    expect(combined).toContain('Hello');
    expect(combined).toContain('World');
  });

  test('multi-script: Latin, Cyrillic, CJK, Arabic, Devanagari — all in one text span', () => {
    const text = 'Hello Привет 你好 مرحبا नमस्ते';
    const result = layoutParagraph(makeParagraph(text));
    const spans = allTextSpans(result);
    const combined = spans.map((s) => s.text).join('');
    expect(combined).toContain('Hello');
    expect(combined).toContain('Привет');
    expect(combined).toContain('你好');
    expect(combined).toContain('مرحبا');
    expect(combined).toContain('नमस्ते');
  });
});

// ── 2. TextRun.type: 'inline-box' ────────────────────────────────────────

describe('TextRun.type: "inline-box"', () => {
  test('type: "inline-box" → Span contains inlineWidget', () => {
    const result = layoutParagraph(makeParagraph('', { type: 'inline-box', inlineWidget: { width: 20, height: 20 } }));
    const inlineSpan = allSpans(result).find((s) => s.inlineWidget);
    expect(inlineSpan).toBeDefined();
  });

  test('inlineWidget.width equals span width', () => {
    const result = layoutParagraph(makeParagraph('', { type: 'inline-box', inlineWidget: { width: 30, height: 20 } }));
    const inlineSpan = allSpans(result).find((s) => s.inlineWidget)!;
    expect(inlineSpan.width).toBe(30);
  });

  test('inlineWidget.height does not affect width', () => {
    const small = layoutParagraph(makeParagraph('', { type: 'inline-box', inlineWidget: { width: 20, height: 10 } }));
    const large = layoutParagraph(makeParagraph('', { type: 'inline-box', inlineWidget: { width: 20, height: 100 } }));
    const smallSpan = allSpans(small).find((s) => s.inlineWidget)!;
    const largeSpan = allSpans(large).find((s) => s.inlineWidget)!;
    expect(smallSpan.width).toBe(largeSpan.width);
  });

  test('inlineWidget.baselineOffset shifts widget position', () => {
    const result = layoutParagraph(makeParagraph('', { type: 'inline-box', inlineWidget: { width: 20, height: 20, baselineOffset: -5 } }));
    const inlineSpan = allSpans(result).find((s) => s.inlineWidget)!;
    expect(inlineSpan.style.inlineWidget?.baselineOffset).toBe(-5);
  });

  test('Span has type: "text" (inline-box is not a space)', () => {
    const result = layoutParagraph(makeParagraph('', { type: 'inline-box', inlineWidget: { width: 20, height: 20 } }));
    for (const s of allSpans(result)) {
      expect(s.type).toBe('text');
      expect(s.type).not.toBe('space');
    }
  });

  test('text inside inline-box is \'\\uFFFC\'', () => {
    const result = layoutParagraph(makeParagraph('', { type: 'inline-box', inlineWidget: { width: 20, height: 20 } }));
    const inlineSpan = allSpans(result).find((s) => s.inlineWidget)!;
    expect(inlineSpan.text).toBe('\uFFFC');
  });
});

// ── 3. TextRun.fontFamily ────────────────────────────────────────────────

describe('TextRun.fontFamily', () => {
  test('fontFamily: "Unifont" → Span.style.fontFamily === "Unifont"', () => {
    const result = layoutParagraph(makeParagraph('Hello', { fontFamily: 'Unifont' }));
    const span = allSpans(result)[0];
    expect(span.style.fontFamily).toBe('Unifont');
  });

  test('fontFamily: "Arial" → different ascent/descent metrics than Unifont', () => {
    const unifontResult = layoutParagraph(makeParagraph('Hello', { fontFamily: 'Unifont' }));
    const arialResult = layoutParagraph(makeStyledParagraph('Hello', { fontFamily: 'Arial' }));
    const unifontSum = unifontResult.lines[0].spans[0].fontMetrics.ascent + unifontResult.lines[0].spans[0].fontMetrics.descent;
    const arialSum = arialResult.lines[0].spans[0].fontMetrics.ascent + arialResult.lines[0].spans[0].fontMetrics.descent;
    expect(Math.abs(unifontSum - arialSum)).toBeGreaterThan(0);
  });

  test('default font from DEFAULT_TEXT_STYLE', () => {
    const result = layoutParagraph(makeParagraph('Hello'));
    const span = allSpans(result)[0];
    expect(span.style.fontFamily).toBe('Arial');
  });
});

// ── 4. TextRun.fontSize ──────────────────────────────────────────────────

describe('TextRun.fontSize', () => {
  test('fontSize: 16 → Span.fontMetrics.fontSize === 16', () => {
    const result = layoutParagraph(makeParagraph('Hello', { fontSize: 16 }));
    expect(allTextSpans(result)[0].fontMetrics.fontSize).toBe(16);
  });

  test('fontSize: 32 → width is ~2× width of fontSize: 16 (with tolerance)', () => {
    const smallResult = layoutParagraph(makeParagraph('Hello', { fontSize: 16 }));
    const largeResult = layoutParagraph(makeParagraph('Hello', { fontSize: 32 }));
    const ratio = largeResult.lines[0].width / smallResult.lines[0].width;
    expect(ratio).toBeGreaterThan(1.4);
    expect(ratio).toBeLessThan(2.6);
  });

  test('larger fontSize → larger line height', () => {
    const smallResult = layoutParagraph(makeParagraph('Hi', { fontSize: 10 }));
    const largeResult = layoutParagraph(makeParagraph('Hi', { fontSize: 20 }));
    expect(largeResult.lines[0].height).toBeGreaterThan(smallResult.lines[0].height);
  });

  test('default fontSize — 12px from DEFAULT_TEXT_STYLE', () => {
    const result = layoutParagraph(makeParagraph('A'));
    expect(allSpans(result)[0].fontMetrics.fontSize).toBe(12);
  });
});

// ── 5. TextRun.fontWeight ────────────────────────────────────────────────

describe('TextRun.fontWeight', () => {
  test('fontWeight: "normal" → Span.style.fontWeight === 400', () => {
    const result = layoutParagraph(makeParagraph('Hello', { fontWeight: 'normal' }));
    expect(allSpans(result)[0].style.fontWeight).toBe(400);
  });

  test('fontWeight: "bold" → Span.style.fontWeight === 700', () => {
    const result = layoutParagraph(makeParagraph('Hello', { fontWeight: 'bold' }));
    expect(allSpans(result)[0].style.fontWeight).toBe(700);
  });

  test('fontWeight: 300 → style.fontWeight === 300 (via compileParagraph)', () => {
    const items = compileParagraph(makeParagraph('Hello', { fontWeight: 300 }));
    expect(items[0].metadata.style.fontWeight).toBe(300);
  });

  test('fontWeight: 900 → style.fontWeight === 900 (via compileParagraph)', () => {
    const items = compileParagraph(makeParagraph('Hello', { fontWeight: 900 }));
    expect(items[0].metadata.style.fontWeight).toBe(900);
  });

  test('default fontWeight — 400 from DEFAULT_TEXT_STYLE', () => {
    const result = layoutParagraph(makeParagraph('Hello'));
    expect(allSpans(result)[0].style.fontWeight).toBe(400);
  });
});

// ── 6. TextRun.fontStyle ─────────────────────────────────────────────────

describe('TextRun.fontStyle', () => {
  test('fontStyle: "normal" → Span.style.fontStyle === "normal"', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hello', { fontStyle: 'normal' })))[0].style.fontStyle).toBe('normal');
  });
  test('fontStyle: "italic" → Span.style.fontStyle === "italic"', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hello', { fontStyle: 'italic' })))[0].style.fontStyle).toBe('italic');
  });
  test('default — "normal"', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hello')))[0].style.fontStyle).toBe('normal');
  });
});

// ── 7. TextRun.color ─────────────────────────────────────────────────────

describe('TextRun.color', () => {
  test('color: "#FF0000" → Span.style.color === "#FF0000"', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hello', { color: '#FF0000' })))[0].style.color).toBe('#FF0000');
  });
  test('color: "#0000FF" → Span.style.color === "#0000FF"', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hello', { color: '#0000FF' })))[0].style.color).toBe('#0000FF');
  });
  test('color: "#000" (3-hex) → correctly preserved', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hello', { color: '#000' })))[0].style.color).toBe('#000');
  });
  test('default — "#000000"', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hello')))[0].style.color).toBe('#000000');
  });
});

// ── 8. TextRun.backgroundColor ──────────────────────────────────────────

describe('TextRun.backgroundColor', () => {
  test('backgroundColor: "#FFFF00" → Span.style.backgroundColor === "#FFFF00"', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hello', { backgroundColor: '#FFFF00' })))[0].style.backgroundColor).toBe('#FFFF00');
  });
  test('no backgroundColor → undefined', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hello')))[0].style.backgroundColor).toBeUndefined();
  });
});

// ── 9. TextRun.letterSpacing ─────────────────────────────────────────────

describe('TextRun.letterSpacing', () => {
  test('letterSpacing: 2 → text wider than without letterSpacing', () => {
    const normalResult = layoutParagraph(makeParagraph('Hello'));
    const spacedResult = layoutParagraph(makeParagraph('Hello', { letterSpacing: 2 }));
    expect(spacedResult.lines[0].width).toBeGreaterThan(normalResult.lines[0].width);
  });
  test('letterSpacing: 0 → same width as without letterSpacing', () => {
    const a = layoutParagraph(makeParagraph('Hello')).lines[0].width;
    const b = layoutParagraph(makeParagraph('Hello', { letterSpacing: 0 })).lines[0].width;
    expect(Math.abs(a - b)).toBeLessThan(1);
  });
  test('negative letterSpacing reduces width', () => {
    const normalResult = layoutParagraph(makeParagraph('Hello'));
    const tightResult = layoutParagraph(makeParagraph('Hello', { letterSpacing: -1 }));
    expect(tightResult.lines[0].width).toBeLessThan(normalResult.lines[0].width);
  });
});

// ── 10. TextRun.script: 'super' / 'sub' ──────────────────────────────────

describe('TextRun.script: "super" / "sub"', () => {
  test('script: "super" → effectiveFontSize = fontSize * 0.65', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hi', { fontSize: 20, script: 'super' })))[0].fontMetrics.fontSize).toBeCloseTo(20 * 0.65, 0);
  });
  test('script: "super" → baselineOffset = fontSize * -0.4 (raised)', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hi', { fontSize: 20, script: 'super' })))[0].style.script).toBe('super');
  });
  test('script: "sub" → effectiveFontSize = fontSize * 0.65', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hi', { fontSize: 20, script: 'sub' })))[0].fontMetrics.fontSize).toBeCloseTo(20 * 0.65, 0);
  });
  test('script: "sub" → baselineOffset = fontSize * 0.25 (lowered)', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hi', { fontSize: 20, script: 'sub' })))[0].style.script).toBe('sub');
  });
  test('script: "normal" → no scaling, no offset', () => {
    const span = allSpans(layoutParagraph(makeParagraph('Hi', { fontSize: 20, script: 'normal' })))[0];
    expect(span.fontMetrics.fontSize).toBe(20);
    expect(span.style.script).toBe('normal');
  });
  test('Span.fontMetrics.fontSize uses effective (scaled) size', () => {
    const n = layoutParagraph(makeParagraph('Hi', { fontSize: 20 })).lines[0].spans[0].fontMetrics.fontSize;
    const s = layoutParagraph(makeParagraph('Hi', { fontSize: 20, script: 'super' })).lines[0].spans[0].fontMetrics.fontSize;
    expect(s).toBeLessThan(n);
  });
  test('normal + superscript mixed in one line — baseline is consistent', () => {
    const result = layoutParagraph(makeMultiRunParagraph([
      { text: 'Normal ' },
      { text: 'Super', style: { fontSize: 20, script: 'super' } },
    ]));
    expect(result.lines[0].baseline).toBeGreaterThan(0);
    expect(result.lines.length).toBe(1);
  });

  test('superscript → baselineOffset = fontSize * -0.4 (negative, raised)', () => {
    const span = allSpans(layoutParagraph(makeParagraph('Hi', { fontSize: 20, script: 'super' })))[0];
    expect(span.fontMetrics.baselineOffset).toBeCloseTo(20 * -0.4, 1);
  });

  test('subscript → baselineOffset = fontSize * 0.25 (positive, lowered)', () => {
    const span = allSpans(layoutParagraph(makeParagraph('Hi', { fontSize: 20, script: 'sub' })))[0];
    expect(span.fontMetrics.baselineOffset).toBeCloseTo(20 * 0.25, 1);
  });

  test('normal script → baselineOffset is undefined', () => {
    const span = allSpans(layoutParagraph(makeParagraph('Hi', { fontSize: 20, script: 'normal' })))[0];
    expect(span.fontMetrics.baselineOffset).toBeUndefined();
  });
});

// ── 11–13. Decorations ───────────────────────────────────────────────────

describe('TextRun.underline', () => {
  test('underline: true → Span.style.underline === true', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hello', { underline: true })))[0].style.underline).toBe(true);
  });
  test('underline: false → Span.style.underline === false', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hello', { underline: false })))[0].style.underline).toBe(false);
  });
  test('underline does not affect width or height', () => {
    const w = layoutParagraph(makeParagraph('Hello')).lines[0].width;
    const h = layoutParagraph(makeParagraph('Hello')).lines[0].height;
    expect(layoutParagraph(makeParagraph('Hello', { underline: true })).lines[0].width).toBe(w);
    expect(layoutParagraph(makeParagraph('Hello', { underline: true })).lines[0].height).toBe(h);
  });
});

describe('TextRun.strikethrough', () => {
  test('strikethrough: true → Span.style.strikethrough === true', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hello', { strikethrough: true })))[0].style.strikethrough).toBe(true);
  });
  test('strikethrough: false → Span.style.strikethrough === false', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hello', { strikethrough: false })))[0].style.strikethrough).toBe(false);
  });
  test('strikethrough does not affect width or height', () => {
    const w = layoutParagraph(makeParagraph('Hello')).lines[0].width;
    const h = layoutParagraph(makeParagraph('Hello')).lines[0].height;
    expect(layoutParagraph(makeParagraph('Hello', { strikethrough: true })).lines[0].width).toBe(w);
    expect(layoutParagraph(makeParagraph('Hello', { strikethrough: true })).lines[0].height).toBe(h);
  });
});

describe('TextRun.overline', () => {
  test('overline: true → Span.style.overline === true', () => {
    expect(allSpans(layoutParagraph(makeParagraph('Hello', { overline: true })))[0].style.overline).toBe(true);
  });
  test('overline does not affect width or height', () => {
    const w = layoutParagraph(makeParagraph('Hello')).lines[0].width;
    const h = layoutParagraph(makeParagraph('Hello')).lines[0].height;
    expect(layoutParagraph(makeParagraph('Hello', { overline: true })).lines[0].width).toBe(w);
    expect(layoutParagraph(makeParagraph('Hello', { overline: true })).lines[0].height).toBe(h);
  });
});

// ── 14. Multi-run styling ────────────────────────────────────────────────

describe('Multi-run styling', () => {
  test('each TextRun → separate itemIndex', () => {
    const spans = allSpans(layoutParagraph(makeMultiRunParagraph([{ text: 'Hello' }, { text: 'World' }])));
    expect(spans.length).toBeGreaterThanOrEqual(2);
    expect(spans.filter((s) => s.itemIndex === 0).length).toBeGreaterThan(0);
    expect(spans.filter((s) => s.itemIndex === 1).length).toBeGreaterThan(0);
  });

  test('adjacent runs with identical styles → different Span (no merge)', () => {
    const spans = allSpans(layoutParagraph(makeMultiRunParagraph([{ text: 'Hello' }, { text: 'World' }])));
    const run0 = spans.filter((s) => s.itemIndex === 0);
    const run1 = spans.filter((s) => s.itemIndex === 1);
    expect(run0.length).toBeGreaterThan(0);
    expect(run1.length).toBeGreaterThan(0);
  });

  test('space across runs: "Hello" + " World"', () => {
    const result = layoutParagraph(makeMultiRunParagraph([{ text: 'Hello' }, { text: ' World' }]));
    const texts = spanTexts(result);
    expect(texts.some((t) => t === 'Hello')).toBe(true);
    expect(texts.some((t) => t === 'World')).toBe(true);
    expect(texts.some((t) => t === ' ')).toBe(true);
  });

  test('space inside run: "Hello " + "World"', () => {
    const result = layoutParagraph(makeMultiRunParagraph([{ text: 'Hello ' }, { text: 'World' }]));
    const texts = spanTexts(result);
    expect(texts.some((t) => t === 'Hello')).toBe(true);
    expect(texts.some((t) => t === 'World')).toBe(true);
  });

  test('standalone space run: "Hello" + " " + "World"', () => {
    const result = layoutParagraph(makeMultiRunParagraph([{ text: 'Hello' }, { text: ' ' }, { text: 'World' }]));
    const texts = spanTexts(result);
    expect(texts.some((t) => t === 'Hello')).toBe(true);
    expect(texts.some((t) => t === 'World')).toBe(true);
  });
});

// ── 15. Span.trailing ────────────────────────────────────────────────────

describe('Span.trailing', () => {
  test('trailing space marker is optional', () => {
    const spans = allSpans(layoutParagraph(makeParagraph('Hello World ')));
    const trailing = spans.filter((s) => s.trailing);
    for (const t of trailing) expect(t.type).toBe('space');
  });

  test('trailing space does NOT participate in line advance (width fit)', () => {
    const a = layoutParagraph(makeParagraph('Hello ')).lines[0].width;
    const b = layoutParagraph(makeParagraph('Hello')).lines[0].width;
    expect(Math.abs(a - b)).toBeLessThan(5);
  });
});

// ── 16. Span.breakType ───────────────────────────────────────────────────

describe('Span.breakType', () => {
  test('last span of the last line → breakType: undefined', () => {
    const last = lastSpan(layoutParagraph(makeParagraph('Hello')));
    expect(last).toBeDefined();
    expect(last!.breakType).toBeUndefined();
  });

  test('line soft-wrapped → last span has breakType: "soft"', () => {
    const result = layoutParagraph(makeParagraph('Hello World How Are You'), 50);
    expect(result.lines.length).toBeGreaterThanOrEqual(2);
    const firstLine = result.lines[0];
    const lastSpan = firstLine.spans[firstLine.spans.length - 1];
    expect(lastSpan.breakType).toBe('soft');
  });

  test('single-line paragraph → breakType: undefined', () => {
    const last = lastSpan(layoutParagraph(makeParagraph('Single line')));
    expect(last).toBeDefined();
    expect(last!.breakType).toBeUndefined();
  });
});

// ── 17. Span.glyphAdvances ───────────────────────────────────────────────

describe('Span.glyphAdvances', () => {
  test('glyphAdvances array length = text.length', () => {
    for (const span of allTextSpans(layoutParagraph(makeParagraph('Hello')))) {
      if (span.glyphAdvances) expect(span.glyphAdvances.length).toBe(span.text.length);
    }
  });
  test('each advance > 0', () => {
    for (const span of allTextSpans(layoutParagraph(makeParagraph('Hello')))) {
      if (span.glyphAdvances) for (const adv of span.glyphAdvances) expect(adv).toBeGreaterThan(0);
    }
  });
  test('sum(glyphAdvances) ≈ span.width', () => {
    for (const span of allTextSpans(layoutParagraph(makeParagraph('Hello')))) {
      if (span.glyphAdvances && span.glyphAdvances.length > 0) {
        expect(Math.abs(span.glyphAdvances.reduce((a, b) => a + b, 0) - span.width)).toBeLessThan(2);
      }
    }
  });
  test('inline-box: glyphAdvances is undefined', () => {
    const span = allSpans(layoutParagraph(makeParagraph('', { type: 'inline-box', inlineWidget: { width: 20, height: 20 } }))).find((s) => s.inlineWidget);
    expect(span).toBeDefined();
    expect(span!.glyphAdvances).toBeUndefined();
  });
});

// ── 17b. Span.glyphAdvances — Arial proportional font ────────────────────

describe('Span.glyphAdvances — Arial proportional', () => {
  test('Arial glyphAdvances are non-uniform (H ≠ e in width)', () => {
    const result = layoutGlyphParagraph(makeStyledParagraph('Hello', { fontFamily: 'Arial' }));
    for (const span of allTextSpans(result)) {
      if (span.glyphAdvances && span.glyphAdvances.length > 1) {
        // 'H' and 'e' have different widths in Arial proportional font
        const diff = Math.abs(span.glyphAdvances[0] - span.glyphAdvances[1]);
        expect(diff).toBeGreaterThan(0.5);
      }
    }
  });

  test('Arial glyphAdvances differ from Unifont monospace', () => {
    const arial = layoutGlyphParagraph(makeStyledParagraph('Hello', { fontFamily: 'Arial' }));
    const unifont = layoutGlyphParagraph(makeParagraph('Hello', { fontFamily: 'Unifont' }));
    const arialAdvances = allTextSpans(arial)[0]?.glyphAdvances;
    const unifontAdvances = allTextSpans(unifont)[0]?.glyphAdvances;
    expect(arialAdvances).toBeDefined();
    expect(unifontAdvances).toBeDefined();
    // At least one advance should differ significantly (Arial proportional vs Unifont monospace)
    const maxDiff = Math.max(...arialAdvances!.map((a, i) => Math.abs(a - unifontAdvances![i])));
    expect(maxDiff).toBeGreaterThan(1);
  });

  test('sum of Arial glyphAdvances ≈ span.width', () => {
    for (const span of allTextSpans(layoutGlyphParagraph(makeStyledParagraph('Hello', { fontFamily: 'Arial' })))) {
      if (span.glyphAdvances && span.glyphAdvances.length > 0) {
        expect(Math.abs(span.glyphAdvances.reduce((a, b) => a + b, 0) - span.width)).toBeLessThan(2);
      }
    }
  });
});

// ── 18. ParagraphLayoutResult.contentWidth ────────────────────────────────

describe('ParagraphLayoutResult', () => {
  test('single run single line: contentWidth === line.width', () => {
    const result = layoutParagraph(makeParagraph('Hello'));
    expect(result.contentWidth).toBeCloseTo(result.lines[0].width, 3);
  });
  test('multi-line (wrapping): contentWidth >= max(line.width)', () => {
    const result = layoutParagraph(makeParagraph('Hello World How Are You Today'), 50);
    expect(result.lines.length).toBeGreaterThanOrEqual(2);
    const maxLineWidth = Math.max(...result.lines.map((l) => l.width));
    expect(result.contentWidth).toBeGreaterThanOrEqual(maxLineWidth - 0.01);
  });
});

// ── 19. Invariants ───────────────────────────────────────────────────────

describe('Invariants (assertLineInvariants)', () => {
  test('No Overlap: lines do not intersect', () => {
    const result = layoutParagraph(makeParagraph('Hello\nWorld\nTest'), 200);
    for (let i = 1; i < result.lines.length; i++) {
      expect(result.lines[i].y + result.lines[i].height).toBeGreaterThan(result.lines[i - 1].y);
    }
  });
  test('Width Fit: line width ≤ maxWidth', () => {
    const maxWidth = 100;
    const result = layoutParagraph(makeParagraph('Hello World How Are You'), maxWidth);
    for (const line of result.lines) expect(line.width).toBeLessThanOrEqual(maxWidth + 0.5);
  });
  test('Zero-width: width=0 does not crash', () => {
    expect(() => layoutParagraph(makeParagraph('Hello World'), 0)).not.toThrow();
  });
  test('Infinite-width: all text in one line', () => {
    expect(layoutParagraph(makeParagraph('Hello World This Is A Long Text'), Infinity).lines.length).toBe(1);
  });
  test('Baseline Consistency: baseline > 0 for all lines', () => {
    const result = layoutParagraph(makeParagraph('Hello World'), 200);
    for (const line of result.lines) expect(line.baseline).toBeGreaterThan(0);
  });
});

// ── 20. FontWeight → width (Arial) ────────────────────────────────────────

describe('TextRun.fontWeight → width (Arial)', () => {
  test('Arial normal vs Arial bold — bold is wider', () => {
    const normal = layoutParagraph(makeStyledParagraph('Hello', { fontFamily: 'Arial', fontWeight: 'normal' }));
    const bold = layoutParagraph(makeStyledParagraph('Hello', { fontFamily: 'Arial', fontWeight: 'bold' }));
    expect(bold.lines[0].width).toBeGreaterThan(normal.lines[0].width);
  });

  test('Arial 400 vs Arial 700 — 700 is wider', () => {
    const w400 = layoutParagraph(makeStyledParagraph('Hello', { fontFamily: 'Arial', fontWeight: 400 }));
    const w700 = layoutParagraph(makeStyledParagraph('Hello', { fontFamily: 'Arial', fontWeight: 700 }));
    expect(w700.lines[0].width).toBeGreaterThan(w400.lines[0].width);
  });

  test('Arial normal vs Arial italic — does not crash', () => {
    const normal = layoutParagraph(makeStyledParagraph('Hello', { fontFamily: 'Arial', fontStyle: 'normal' }));
    const italic = layoutParagraph(makeStyledParagraph('Hello', { fontFamily: 'Arial', fontStyle: 'italic' }));
    expect(normal.lines[0].width).toBeGreaterThan(0);
    expect(italic.lines[0].width).toBeGreaterThan(0);
  });
});

// ── 21. FontWeight → width (Unifont monospace) ──────────────────────────

describe('TextRun.fontWeight → width (Unifont monospace)', () => {
  test('UnknownFont bold — throws FontNotFoundError', () => {
    expect(() => layoutParagraph(
      makeParagraph('Hello', { fontFamily: 'UnknownFont12345', fontWeight: 'bold' }),
    )).toThrow(FontNotFoundError);
  });
});

// ── 22. FontNotFoundError ────────────────────────────────────────────────

describe('FontNotFoundError', () => {
  test('unregistered fontWeight variant throws FontNotFoundError', () => {
    // Unifont may have bold registered by renderer tests — use truly unknown font
    expect(() => layoutParagraph(
      makeStyledParagraph('Hello', { fontFamily: 'Unifont_UnknownVariant', fontWeight: 'bold' }),
      500,
    )).toThrow(FontNotFoundError);
  });

  test('unregistered font family throws FontNotFoundError', () => {
    expect(() => layoutParagraph(
      makeStyledParagraph('Hello', { fontFamily: 'NonExistentFont12345' }),
      500,
    )).toThrow(FontNotFoundError);
  });
});

// ── 23. Arial registration warning ───────────────────────────────────────

describe('Arial registration warning', () => {
  test('warns when Arial not found on system', async () => {
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await registerArialVariants([]);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const msg = warnSpy.mock.calls[0][0];
      expect(msg).toContain('Arial font files not found');
    } finally {
      warnSpy.mockRestore();
    }
  });
});
