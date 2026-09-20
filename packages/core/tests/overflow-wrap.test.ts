/**
 * overflow-wrap.test.ts — `ParagraphStyle.overflowWrap` (CSS overflow-wrap).
 *
 * Regression cover for: a `<Text>` with no explicit width and a single short
 * unbreakable word (e.g. "Hi") measured narrower than the word's own natural
 * width, because the vendored line-breaker (`@chenglou/pretext`) hardcodes
 * `overflow-wrap: break-word` — any word wider than the available width gets
 * sliced at grapheme boundaries unconditionally, with no way to opt out
 * (confirmed against upstream: no such option exists, see
 * src/vendor/pretext/VENDOR.json and github.com/chenglou/pretext#206).
 *
 * Fix: `overflowWrap` now defaults to `'normal'`, the real CSS default —
 * matching real browsers and PowerPoint, where an atomic word overflows the
 * line instead of being force-split. `'break-word'` / `'anywhere'` restore
 * the old unconditional grapheme fallback for callers that want it.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import type { Paragraph, ParagraphStyle } from '../src/types/Document.js';
import { registerArialVariants, registerUnifont } from './helpers.ts';
import { layoutTextFrame } from '../src/layout/TextFrameLayoutEngine.js';
import { paragraphLayoutEngine } from '../src/layout/ParagraphLayoutEngine.js';

beforeAll(async () => {
  await registerArialVariants();
  await registerUnifont();
});

function lineTexts(lines: { spans: { text?: string }[] }[]): string[] {
  return lines.map((l) => l.spans.map((s) => s.text ?? '').join(''));
}

function paraWith(style: Partial<ParagraphStyle>, text: string): Paragraph {
  return {
    style: { alignment: 'left', lineHeight: 1.2, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal', ...style },
    children: [{ type: 'text', text, fontFamily: 'Arial', fontSize: 12 } as any],
  };
}

describe('overflowWrap: normal (default) — atomic word never breaks mid-word', () => {
  test('"Hi" at an intrinsic-width probe (width: 1e-3) stays one line at its natural width', () => {
    // An intrinsic-width (min-content) probe: a near-zero width, as a layout engine asks for it.
    const res = layoutTextFrame(
      { width: 1e-3, wrap: true, paragraphs: [paraWith({}, 'Hi')] },
      { mode: 'office', onMissingFont: 'substitute', textBoxPadding: 0 },
    );
    expect(res.lines.length).toBe(1);
    expect(lineTexts(res.lines)).toEqual(['Hi']);
    // Natural width in office mode: Arial 12pt 'H' (8.664) and 'i' (2.664), each snapped to
    // PowerPoint's 1/8pt glyph grid (8.625 + 2.625).
    expect(res.textBox.width).toBeCloseTo(11.25, 2);
  });

  test('holds in both office and browser mode (not office-metrics-specific)', () => {
    for (const mode of ['office', 'browser'] as const) {
      const res = layoutTextFrame(
        { width: 1e-3, wrap: true, paragraphs: [paraWith({}, 'Hi')] },
        { mode, onMissingFont: 'substitute' },
      );
      expect(res.lines.length).toBe(1);
    }
  });

  test('a real (non-probe) box narrower than the word overflows instead of splitting', () => {
    const res = layoutTextFrame(
      { width: 8, wrap: true, paragraphs: [paraWith({}, 'Hi')] },
      { mode: 'office', onMissingFont: 'substitute' },
    );
    expect(res.lines.length).toBe(1);
    expect(lineTexts(res.lines)).toEqual(['Hi']);
    expect(res.overflow.horizontal).toBe(true);
  });

  test('multi-word text at a min-content probe breaks at word boundaries, not per character', () => {
    const res = layoutTextFrame(
      { width: 1e-3, wrap: true, paragraphs: [paraWith({}, 'A somewhat longer line of text')] },
      { mode: 'office', onMissingFont: 'substitute' },
    );
    expect(lineTexts(res.lines)).toEqual(['A ', 'somewhat ', 'longer ', 'line ', 'of ', 'text']);
  });

  test('normal-width wrapping is unaffected', () => {
    const res = layoutTextFrame(
      { width: 200, wrap: true, paragraphs: [paraWith({}, 'A somewhat longer line of text that wraps normally across a few lines here')] },
      { mode: 'office', onMissingFont: 'substitute' },
    );
    expect(res.lines.length).toBeGreaterThan(1);
    for (const t of lineTexts(res.lines)) expect(t).not.toMatch(/^.$/); // no single-char lines
  });
});

describe('overflowWrap: break-word / anywhere — explicit opt-in restores grapheme fallback', () => {
  test('"break-word" splits "Hi" at grapheme boundaries when it does not fit', () => {
    const res = layoutTextFrame(
      { width: 1e-3, wrap: true, paragraphs: [paraWith({ overflowWrap: 'break-word' }, 'Hi')] },
      { mode: 'office', onMissingFont: 'substitute' },
    );
    expect(lineTexts(res.lines)).toEqual(['H', 'i']);
  });

  test('"anywhere" also splits "Hi"', () => {
    const res = layoutTextFrame(
      { width: 1e-3, wrap: true, paragraphs: [paraWith({ overflowWrap: 'anywhere' }, 'Hi')] },
      { mode: 'office', onMissingFont: 'substitute' },
    );
    expect(lineTexts(res.lines)).toEqual(['H', 'i']);
  });

  test('explicit "normal" is equivalent to the default', () => {
    const res = layoutTextFrame(
      { width: 1e-3, wrap: true, paragraphs: [paraWith({ overflowWrap: 'normal' }, 'Hi')] },
      { mode: 'office', onMissingFont: 'substitute' },
    );
    expect(lineTexts(res.lines)).toEqual(['Hi']);
  });
});

describe('prepared-line cache respects overflowWrap', () => {
  // Regression for a cache-correctness bug found while fixing this: the
  // paragraph-level `overflowWrap` changes what prepareRichInline() returns,
  // but the ParagraphLayoutEngine prepared-line LRU cache used to key only on
  // run fields (text/font/...), so two paragraphs with identical text/font
  // but different overflowWrap silently shared one cached (wrong) result.
  test('same text+font, different overflowWrap, laid out back-to-back both come out right', () => {
    const engine = paragraphLayoutEngine;
    const normalRes = engine.layout(paraWith({}, 'Hi'), 1e-3, 0, undefined, undefined, undefined, undefined, false, 'office', 'substitute');
    const breakRes = engine.layout(paraWith({ overflowWrap: 'break-word' }, 'Hi'), 1e-3, 0, undefined, undefined, undefined, undefined, false, 'office', 'substitute');
    const normalAgainRes = engine.layout(paraWith({}, 'Hi'), 1e-3, 0, undefined, undefined, undefined, undefined, false, 'office', 'substitute');

    expect(lineTexts(normalRes.lines)).toEqual(['Hi']);
    expect(lineTexts(breakRes.lines)).toEqual(['H', 'i']);
    expect(lineTexts(normalAgainRes.lines)).toEqual(['Hi']);
  });
});

describe('CJK segmentation is unaffected by overflowWrap (not gated by it)', () => {
  test('CJK text still breaks between characters at a narrow width under the default', () => {
    const res = layoutTextFrame(
      { width: 20, wrap: true, paragraphs: [paraWith({}, '漢字漢字漢字漢字')] },
      { mode: 'office', onMissingFont: 'substitute' },
    );
    // Unregistered CJK glyphs fall back to Arial's .notdef box width, but the
    // point here is purely that CJK still wraps mid-run (unlike "Hi" above).
    expect(res.lines.length).toBeGreaterThan(1);
  });
});
