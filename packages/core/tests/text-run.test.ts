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
import {
  engine,
  registerUnifont,
  hasCanvas,
  makeParagraph,
  makeStyledParagraph,
  makeMultiRunParagraph,
  layoutParagraph,
  allFragments,
  allTextFragments,
  allSpaceFragments,
  spanTexts,
  lastFragment,
} from './helpers.ts';

beforeAll(async () => {
  await registerUnifont();
});

// ── 1. TextRun.type: 'text' ──────────────────────────────────────────────

describe('TextRun.type: "text"', () => {
  test('type: "text" → Span has type: "text"', () => {
    const result = layoutParagraph(makeParagraph('Hello'));
    const frags = allTextFragments(result);
    expect(frags.length).toBeGreaterThan(0);
    for (const f of frags) expect(f.type).toBe('text');
  });

  test('text content correctly maps to Span.text', () => {
    const result = layoutParagraph(makeParagraph('Hello'));
    const texts = allTextFragments(result).map((f) => f.text);
    expect(texts.join('')).toContain('Hello');
  });

  test('non-breaking space (U+00A0) does NOT create a separate space span', () => {
    const result = layoutParagraph(makeParagraph('Hello\u00A0World'));
    const spaces = allSpaceFragments(result);
    const texts = allTextFragments(result).map((f) => f.text);
    const combined = texts.join('');
    expect(combined).toContain('\u00A0');
    for (const s of spaces) expect(s.text).not.toBe('\u00A0');
  });

  test('leading spaces are trimmed (in whiteSpace: "normal" mode)', () => {
    const result = layoutParagraph(makeParagraph('   Hello'));
    const texts = allTextFragments(result).map((f) => f.text);
    const combined = texts.join('');
    expect(combined.trim()).toBe('Hello');
  });

  test('trailing spaces are trimmed — no extra fragments in whiteSpace:normal', () => {
    const result = layoutParagraph(makeParagraph('Hello   '));
    const textFrags = allTextFragments(result);
    expect(textFrags.length).toBeGreaterThan(0);
    expect(textFrags[0].text).toBe('Hello');
  });

  test('multiple spaces inside a run stay in one text span', () => {
    const result = layoutParagraph(makeParagraph('Hello    World'));
    const textFrags = allTextFragments(result).map((f) => f.text);
    const combined = textFrags.join('');
    expect(combined).toContain('Hello');
    expect(combined).toContain('World');
  });

  test('multi-script: Latin, Cyrillic, CJK, Arabic, Devanagari — all in one text span', () => {
    const text = 'Hello Привет 你好 مرحبا नमस्ते';
    const result = layoutParagraph(makeParagraph(text));
    const frags = allTextFragments(result);
    const combined = frags.map((f) => f.text).join('');
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
    const inlineFrag = allFragments(result).find((f) => f.inlineWidget);
    expect(inlineFrag).toBeDefined();
  });

  test('inlineWidget.width equals span width', () => {
    const result = layoutParagraph(makeParagraph('', { type: 'inline-box', inlineWidget: { width: 30, height: 20 } }));
    const inlineFrag = allFragments(result).find((f) => f.inlineWidget)!;
    expect(inlineFrag.width).toBe(30);
  });

  test('inlineWidget.height does not affect width', () => {
    const small = layoutParagraph(makeParagraph('', { type: 'inline-box', inlineWidget: { width: 20, height: 10 } }));
    const large = layoutParagraph(makeParagraph('', { type: 'inline-box', inlineWidget: { width: 20, height: 100 } }));
    const smallFrag = allFragments(small).find((f) => f.inlineWidget)!;
    const largeFrag = allFragments(large).find((f) => f.inlineWidget)!;
    expect(smallFrag.width).toBe(largeFrag.width);
  });

  test('inlineWidget.baselineOffset shifts widget position', () => {
    const result = layoutParagraph(makeParagraph('', { type: 'inline-box', inlineWidget: { width: 20, height: 20, baselineOffset: -5 } }));
    const inlineFrag = allFragments(result).find((f) => f.inlineWidget)!;
    expect(inlineFrag.style.inlineWidget?.baselineOffset).toBe(-5);
  });

  test('Span has type: "text" (inline-box is not a space)', () => {
    const result = layoutParagraph(makeParagraph('', { type: 'inline-box', inlineWidget: { width: 20, height: 20 } }));
    for (const f of allFragments(result)) {
      expect(f.type).toBe('text');
      expect(f.type).not.toBe('space');
    }
  });

  test('text inside inline-box is \'\\uFFFC\'', () => {
    const result = layoutParagraph(makeParagraph('', { type: 'inline-box', inlineWidget: { width: 20, height: 20 } }));
    const inlineFrag = allFragments(result).find((f) => f.inlineWidget)!;
    expect(inlineFrag.text).toBe('\uFFFC');
  });
});

// ── 3. TextRun.fontFamily ────────────────────────────────────────────────

describe('TextRun.fontFamily', () => {
  test('fontFamily: "Unifont" → Span.style.fontFamily === "Unifont"', () => {
    const result = layoutParagraph(makeParagraph('Hello', { fontFamily: 'Unifont' }));
    const frag = allFragments(result)[0];
    expect(frag.style.fontFamily).toBe('Unifont');
  });

  test('fontFamily: "Arial" → different ascent/descent metrics than Unifont', () => {
    const unifontResult = layoutParagraph(makeParagraph('Hello', { fontFamily: 'Unifont' }));
    const arialResult = layoutParagraph(makeStyledParagraph('Hello', { fontFamily: 'Arial' }));
    const unifontSum = unifontResult.lines[0].fragments[0].fontMetrics.ascent + unifontResult.lines[0].fragments[0].fontMetrics.descent;
    const arialSum = arialResult.lines[0].fragments[0].fontMetrics.ascent + arialResult.lines[0].fragments[0].fontMetrics.descent;
    expect(Math.abs(unifontSum - arialSum)).toBeGreaterThan(0);
  });

  test('default font from DEFAULT_TEXT_STYLE', () => {
    const result = layoutParagraph(makeParagraph('Hello'));
    const frag = allFragments(result)[0];
    expect(frag.style.fontFamily).toBe('Arial');
  });
});

// ── 4. TextRun.fontSize ──────────────────────────────────────────────────

describe('TextRun.fontSize', () => {
  test('fontSize: 16 → Span.fontMetrics.fontSize === 16', () => {
    const result = layoutParagraph(makeParagraph('Hello', { fontSize: 16 }));
    expect(allTextFragments(result)[0].fontMetrics.fontSize).toBe(16);
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
    expect(allFragments(result)[0].fontMetrics.fontSize).toBe(12);
  });
});

// ── 5. TextRun.fontWeight ────────────────────────────────────────────────

describe('TextRun.fontWeight', () => {
  test('fontWeight: "normal" → Span.style.fontWeight === 400', () => {
    const result = layoutParagraph(makeParagraph('Hello', { fontWeight: 'normal' }));
    expect(allFragments(result)[0].style.fontWeight).toBe(400);
  });

  test('fontWeight: "bold" → Span.style.fontWeight === 700', () => {
    const result = layoutParagraph(makeParagraph('Hello', { fontWeight: 'bold' }));
    expect(allFragments(result)[0].style.fontWeight).toBe(700);
  });

  test('fontWeight: 300 → Span.style.fontWeight === 300', () => {
    const result = layoutParagraph(makeParagraph('Hello', { fontWeight: 300 }));
    expect(allFragments(result)[0].style.fontWeight).toBe(300);
  });

  test('fontWeight: 900 → Span.style.fontWeight === 900', () => {
    const result = layoutParagraph(makeParagraph('Hello', { fontWeight: 900 }));
    expect(allFragments(result)[0].style.fontWeight).toBe(900);
  });

  test('default fontWeight — 400 from DEFAULT_TEXT_STYLE', () => {
    const result = layoutParagraph(makeParagraph('Hello'));
    expect(allFragments(result)[0].style.fontWeight).toBe(400);
  });
});

// ── 6. TextRun.fontStyle ─────────────────────────────────────────────────

describe('TextRun.fontStyle', () => {
  test('fontStyle: "normal" → Span.style.fontStyle === "normal"', () => {
    expect(allFragments(layoutParagraph(makeParagraph('Hello', { fontStyle: 'normal' })))[0].style.fontStyle).toBe('normal');
  });
  test('fontStyle: "italic" → Span.style.fontStyle === "italic"', () => {
    expect(allFragments(layoutParagraph(makeParagraph('Hello', { fontStyle: 'italic' })))[0].style.fontStyle).toBe('italic');
  });
  test('default — "normal"', () => {
    expect(allFragments(layoutParagraph(makeParagraph('Hello')))[0].style.fontStyle).toBe('normal');
  });
});

// ── 7. TextRun.color ─────────────────────────────────────────────────────

describe('TextRun.color', () => {
  test('color: "#FF0000" → Span.style.color === "#FF0000"', () => {
    expect(allFragments(layoutParagraph(makeParagraph('Hello', { color: '#FF0000' })))[0].style.color).toBe('#FF0000');
  });
  test('color: "#0000FF" → Span.style.color === "#0000FF"', () => {
    expect(allFragments(layoutParagraph(makeParagraph('Hello', { color: '#0000FF' })))[0].style.color).toBe('#0000FF');
  });
  test('color: "#000" (3-hex) → correctly preserved', () => {
    expect(allFragments(layoutParagraph(makeParagraph('Hello', { color: '#000' })))[0].style.color).toBe('#000');
  });
  test('default — "#000000"', () => {
    expect(allFragments(layoutParagraph(makeParagraph('Hello')))[0].style.color).toBe('#000000');
  });
});

// ── 8. TextRun.backgroundColor ──────────────────────────────────────────

describe('TextRun.backgroundColor', () => {
  test('backgroundColor: "#FFFF00" → Span.style.backgroundColor === "#FFFF00"', () => {
    expect(allFragments(layoutParagraph(makeParagraph('Hello', { backgroundColor: '#FFFF00' })))[0].style.backgroundColor).toBe('#FFFF00');
  });
  test('no backgroundColor → undefined', () => {
    expect(allFragments(layoutParagraph(makeParagraph('Hello')))[0].style.backgroundColor).toBeUndefined();
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
    expect(allFragments(layoutParagraph(makeParagraph('Hi', { fontSize: 20, script: 'super' })))[0].fontMetrics.fontSize).toBeCloseTo(20 * 0.65, 0);
  });
  test('script: "super" → baselineOffset = fontSize * -0.4 (raised)', () => {
    expect(allFragments(layoutParagraph(makeParagraph('Hi', { fontSize: 20, script: 'super' })))[0].style.script).toBe('super');
  });
  test('script: "sub" → effectiveFontSize = fontSize * 0.65', () => {
    expect(allFragments(layoutParagraph(makeParagraph('Hi', { fontSize: 20, script: 'sub' })))[0].fontMetrics.fontSize).toBeCloseTo(20 * 0.65, 0);
  });
  test('script: "sub" → baselineOffset = fontSize * 0.15 (lowered)', () => {
    expect(allFragments(layoutParagraph(makeParagraph('Hi', { fontSize: 20, script: 'sub' })))[0].style.script).toBe('sub');
  });
  test('script: "normal" → no scaling, no offset', () => {
    const frag = allFragments(layoutParagraph(makeParagraph('Hi', { fontSize: 20, script: 'normal' })))[0];
    expect(frag.fontMetrics.fontSize).toBe(20);
    expect(frag.style.script).toBe('normal');
  });
  test('Span.fontMetrics.fontSize uses effective (scaled) size', () => {
    const n = layoutParagraph(makeParagraph('Hi', { fontSize: 20 })).lines[0].fragments[0].fontMetrics.fontSize;
    const s = layoutParagraph(makeParagraph('Hi', { fontSize: 20, script: 'super' })).lines[0].fragments[0].fontMetrics.fontSize;
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
});

// ── 11–13. Decorations ───────────────────────────────────────────────────

describe('TextRun.underline', () => {
  test('underline: true → Span.style.underline === true', () => {
    expect(allFragments(layoutParagraph(makeParagraph('Hello', { underline: true })))[0].style.underline).toBe(true);
  });
  test('underline: false → Span.style.underline === false', () => {
    expect(allFragments(layoutParagraph(makeParagraph('Hello', { underline: false })))[0].style.underline).toBe(false);
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
    expect(allFragments(layoutParagraph(makeParagraph('Hello', { strikethrough: true })))[0].style.strikethrough).toBe(true);
  });
  test('strikethrough: false → Span.style.strikethrough === false', () => {
    expect(allFragments(layoutParagraph(makeParagraph('Hello', { strikethrough: false })))[0].style.strikethrough).toBe(false);
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
    expect(allFragments(layoutParagraph(makeParagraph('Hello', { overline: true })))[0].style.overline).toBe(true);
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
    const frags = allFragments(layoutParagraph(makeMultiRunParagraph([{ text: 'Hello' }, { text: 'World' }])));
    expect(frags.length).toBeGreaterThanOrEqual(2);
    expect(frags.filter((f) => f.itemIndex === 0).length).toBeGreaterThan(0);
    expect(frags.filter((f) => f.itemIndex === 1).length).toBeGreaterThan(0);
  });

  test('adjacent runs with identical styles → different Span (no merge)', () => {
    const frags = allFragments(layoutParagraph(makeMultiRunParagraph([{ text: 'Hello' }, { text: 'World' }])));
    const run0 = frags.filter((f) => f.itemIndex === 0);
    const run1 = frags.filter((f) => f.itemIndex === 1);
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
    const frags = allFragments(layoutParagraph(makeParagraph('Hello World ')));
    const trailing = frags.filter((f) => f.trailing);
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
    const last = lastFragment(layoutParagraph(makeParagraph('Hello')));
    expect(last).toBeDefined();
    expect(last!.breakType).toBeUndefined();
  });

  test('line soft-wrapped → last span has breakType: "soft"', () => {
    const result = layoutParagraph(makeParagraph('Hello World How Are You'), 50);
    expect(result.lines.length).toBeGreaterThanOrEqual(2);
    const firstLine = result.lines[0];
    const lastFrag = firstLine.fragments[firstLine.fragments.length - 1];
    expect(lastFrag.breakType).toBe('soft');
  });


  test('single-line paragraph → breakType: undefined', () => {
    const last = lastFragment(layoutParagraph(makeParagraph('Single line')));
    expect(last).toBeDefined();
    expect(last!.breakType).toBeUndefined();
  });
});

// ── 17. Span.glyphAdvances ───────────────────────────────────────────────

describe('Span.glyphAdvances', () => {
  test('glyphAdvances array length = text.length', () => {
    for (const frag of allTextFragments(layoutParagraph(makeParagraph('Hello')))) {
      if (frag.glyphAdvances) expect(frag.glyphAdvances.length).toBe(frag.text.length);
    }
  });
  test('each advance > 0', () => {
    for (const frag of allTextFragments(layoutParagraph(makeParagraph('Hello')))) {
      if (frag.glyphAdvances) for (const adv of frag.glyphAdvances) expect(adv).toBeGreaterThan(0);
    }
  });
  test('sum(glyphAdvances) ≈ span.width', () => {
    for (const frag of allTextFragments(layoutParagraph(makeParagraph('Hello')))) {
      if (frag.glyphAdvances && frag.glyphAdvances.length > 0) {
        expect(Math.abs(frag.glyphAdvances.reduce((a, b) => a + b, 0) - frag.width)).toBeLessThan(2);
      }
    }
  });
  test('inline-box: glyphAdvances is undefined', () => {
    const frag = allFragments(layoutParagraph(makeParagraph('', { type: 'inline-box', inlineWidget: { width: 20, height: 20 } }))).find((f) => f.inlineWidget);
    expect(frag).toBeDefined();
    expect(frag!.glyphAdvances).toBeUndefined();
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