/**
 * office-text-features.test.ts — justify, list markers, whitespace / source
 * indices, empty lines, decoration geometry and hyphen breaks, against
 * PowerPoint for Mac 16.93.
 *
 * Expected numbers are PowerPoint's own, from
 * scripts/office-metrics/text-features.json (object-model bounds, exact) —
 * case names in each test. Decoration geometry is checked against the font
 * tables PowerPoint was measured to use (PDF export snaps rules to whole pt;
 * see scripts/office-metrics/TEXT-FEATURES-RESULTS.md §5).
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import type { Paragraph, ParagraphStyle, TextRun } from '../src/types/Document.js';
import type { Line } from '../src/types/LayoutTypes.js';
import { registerArialVariants, registerUnifont, REAL_ARIAL } from './helpers.ts';
import { layoutTextFrame, splitParagraphAtHardBreaks } from '@vyaz/core';

beforeAll(async () => {
  await registerUnifont();
  await registerArialVariants();
});

const PARA =
  'The quick brown fox jumps over the lazy dog while a frame measures every ' +
  'line box and decides where each word wraps inside the given rectangle.';

const run = (text: string, extra: Partial<TextRun> = {}): TextRun =>
  ({ type: 'text', text, fontFamily: 'Arial', fontSize: 16, ...extra }) as TextRun;
const para = (children: TextRun[], style: Partial<ParagraphStyle> = {}): Paragraph =>
  ({ style: { alignment: 'left', lineHeight: 1, spaceBefore: 0, spaceAfter: 0, ...style }, children }) as Paragraph;
const office = (width: number, paragraphs: Paragraph[]) =>
  layoutTextFrame({ width, wrap: true, paragraphs }, { mode: 'office', glyphAdvances: true, textBoxPadding: 0 });
const textOf = (l: Line) => l.spans.filter((s) => s.type !== 'marker').map((s) => s.text).join('');
/** Right edge of the last glyph (not a space) on the line, from the line origin. */
const inkRight = (l: Line) => {
  const minX = Math.min(...l.spans.map((s) => s.x));
  const ink = l.spans.filter((s) => s.type === 'text' && s.text.trim());
  return Math.max(...ink.map((s) => l.x + (s.x - minX) + s.width));
};

describe.skipIf(!REAL_ARIAL)('justify — every space of the line stretches (PowerPoint)', () => {
  test('one run: every line but the last ends at the box edge (j-single: 200.01)', () => {
    const r = office(200, [para([run(PARA)], { alignment: 'justify' })]);
    expect(r.lines.map(textOf)).toEqual([
      'The quick brown fox jumps ', 'over the lazy dog while a ', 'frame measures every line ',
      'box and decides where ', 'each word wraps inside the ', 'given rectangle.',
    ]);
    for (const l of r.lines.slice(0, -1)) expect(inkRight(l)).toBeCloseTo(200, 1);
    expect(inkRight(r.lines[5])).toBeCloseTo(112.88, 1); // last line: not stretched
  });

  test('each space takes the same share: 4.5 + 9.75 / 4 = 6.94 (j-single line 0)', () => {
    const r = office(200, [para([run(PARA)], { alignment: 'justify' })]);
    const spaces = r.lines[0].spans.filter((s) => s.type === 'space' && !s.trailing);
    expect(spaces.length).toBe(4);
    for (const s of spaces) expect(s.width).toBeCloseTo(6.94, 1);
  });

  test('a run of spaces gets one share per space (j-multispace: 6.23 each)', () => {
    const r = office(200, [para([run('Two  spaces   three    four spaces between words that wrap here.')], { alignment: 'justify' })]);
    expect(textOf(r.lines[0])).toBe('Two  spaces   three    four ');
    const spaces = r.lines[0].spans.filter((s) => s.type === 'space' && !s.trailing);
    for (const s of spaces) expect(s.width / s.text.length).toBeCloseTo(6.23, 1);
  });

  test('office stretches a line ending in \\n, browser does not (j-br)', () => {
    const p = [para([run('Short line ends in a break\nthen the text continues long enough to wrap twice inside the box.')], { alignment: 'justify' })];
    expect(inkRight(office(200, p).lines[0])).toBeCloseTo(200, 1);
    const b = layoutTextFrame({ width: 200, wrap: true, paragraphs: [{ ...p[0], style: { ...p[0].style, whiteSpace: 'pre-line' } }] }, { mode: 'browser' });
    expect(inkRight(b.lines[0])).toBeLessThan(190);
  });
});

describe.skipIf(!REAL_ARIAL)('list markers — PowerPoint placement (office)', () => {
  // DrawingML marL / indent → leftIndent = marL + indent, bulletIndent = -indent
  const item = (text: string, marL: number, indent: number, list: object, extra: Partial<TextRun> = {}) =>
    para([run(text, extra)], { leftIndent: marL + indent, listStyle: { bulletIndent: -indent, ...list } as any });
  const marker = (l: Line) => l.spans.find((s) => s.type === 'marker')!;
  const textX = (l: Line) => l.spans.find((s) => s.type === 'text')!.x;

  test('bullet left-aligned at marL + indent, text at marL, size 100 % (l-bullet-27, l-bullet-indent40)', () => {
    const r = office(260, [item('First item', 27, -27, { type: 'bullet', bulletChar: '•' }), item('marL 40 indent -20', 40, -20, { type: 'bullet', bulletChar: '•' })]);
    expect(marker(r.lines[0]).x).toBe(0);
    expect(textX(r.lines[0])).toBe(27);
    expect(marker(r.lines[0]).fontMetrics.fontSize).toBe(16);
    expect(marker(r.lines[1]).x).toBe(20);
    expect(textX(r.lines[1])).toBe(40);
  });

  test('a marker wider than the hanging indent pushes the text, per paragraph (l-bullet-0, l-number-12)', () => {
    expect(textX(office(260, [item('No hanging indent at all', 0, 0, { type: 'bullet', bulletChar: '•' })]).lines[0])).toBeCloseTo(5.63, 1);
    const nums = office(260, Array.from({ length: 11 }, (_, i) => item(`Item ${i + 1}`, 12, -12, { type: 'number' })));
    expect(textX(nums.lines[0])).toBeCloseTo(13.38, 1); // "1."
    expect(textX(nums.lines[9])).toBeCloseTo(22.25, 1); // "10."
    expect(textX(nums.lines[10])).toBeCloseTo(22.25, 1); // "11." — not kerned
  });

  test('bulletSize scales the marker, and the marker never grows the line (l-bullet-pct)', () => {
    const r = office(300, [50, 150].map((pct) => item(`buSzPct ${pct}`, 36, -36, { type: 'bullet', bulletChar: '•', bulletSize: pct / 100 }, { fontSize: 24 })));
    expect(marker(r.lines[0]).fontMetrics.fontSize).toBe(12);
    expect(marker(r.lines[1]).fontMetrics.fontSize).toBe(36);
    for (const l of r.lines) expect(l.height).toBeCloseTo(28.8, 2);
  });

  test('a \\n inside a list item continues at marL without a second marker', () => {
    const r = office(260, [item('one\ntwo', 27, -27, { type: 'bullet', bulletChar: '•' })]);
    expect(r.lines.length).toBe(2);
    expect(r.lines[1].spans.some((s) => s.type === 'marker')).toBe(false);
    expect(textX(r.lines[1])).toBe(27);
  });
});

describe.skipIf(!REAL_ARIAL)('whitespace and source indices', () => {
  test('office keeps every space; lines are raw-text offsets (s-multispace, s-wrap-spaces)', () => {
    const r = office(80, [para([run('aaa    bbb   ccc dddddd eeeee  fffff')])]);
    expect(r.lines.map(textOf)).toEqual(['aaa    bbb   ', 'ccc ', 'dddddd ', 'eeeee  fffff']);
    expect(r.lines.map((l) => [l.startIndex, l.endIndex])).toEqual([[0, 13], [13, 17], [17, 24], [24, 36]]);
    const w = office(100, [para([run('word          next word after many spaces')])]);
    expect(w.lines.map(textOf)).toEqual(['word          ', 'next word ', 'after many ', 'spaces']);
  });

  test('collapsed whitespace: lines still tile the source text (browser)', () => {
    const src = 'aaa    bbb   ccc dddddd eeeee  fffff';
    const r = layoutTextFrame({ width: 80, wrap: true, paragraphs: [para([run(src)], { whiteSpace: 'normal' })] }, { mode: 'browser' });
    expect(r.lines[0].startIndex).toBe(0);
    expect(r.lines[r.lines.length - 1].endIndex).toBe(src.length);
    for (let i = 1; i < r.lines.length; i++) expect(r.lines[i].startIndex).toBe(r.lines[i - 1].endIndex);
    const squeeze = (t: string) => t.replace(/\s+/g, ' ').trim();
    for (const l of r.lines) expect(squeeze(src.slice(l.startIndex, l.endIndex))).toBe(squeeze(textOf(l)));
    for (const l of r.lines) for (const s of l.spans) {
      if (s.type === 'text') expect(squeeze(src.slice(s.startIndex!, s.endIndex!))).toBe(s.text);
    }
  });

  test('indices run on across \\n, which belongs to the line it ends (j-br: [0,27) [27,56))', () => {
    const r = office(200, [para([run('Short line ends in a break\nthen the text continues long enough to wrap twice inside the box.')])]);
    expect([r.lines[0].startIndex, r.lines[0].endIndex]).toEqual([0, 27]);
    expect(r.lines[1].startIndex).toBe(27);
  });
});

describe.skipIf(!REAL_ARIAL)('empty lines', () => {
  test('a\\n\\nb is three lines of the run size; a trailing \\n adds one in office (e-br-br, e-br-end)', () => {
    const r = office(200, [para([run('a\n\nb', { fontSize: 40 })])]);
    expect(r.lines.map((l) => l.height)).toEqual([48, 48, 48]);
    expect(r.lines.map((l) => [l.startIndex, l.endIndex])).toEqual([[0, 2], [2, 3], [3, 4]]);
    const e = office(200, [para([run('a\n', { fontSize: 40 })]), para([run('b', { fontSize: 40 })])]);
    expect(e.lines.map((l) => l.y)).toEqual([0, 48, 96]);
  });

  test('browser: a\\n\\nb is three lines, a trailing \\n none', () => {
    const lay = (text: string) => layoutTextFrame({ width: 200, wrap: true, paragraphs: [para([run(text, { fontSize: 40 })], { whiteSpace: 'pre-line' })] }, { mode: 'browser' });
    expect(lay('a\n\nb').lines.length).toBe(3);
    expect(lay('a\n').lines.length).toBe(1);
    expect(lay('\n').lines.length).toBe(1);
  });

  test('an empty run is one line at its size, and every line knows its paragraph (e-empty-run)', () => {
    const r = office(200, [para([run('A', { fontSize: 40 })]), para([run('', { fontSize: 40 })]), para([run('B', { fontSize: 40 })])]);
    expect(r.lines.map((l) => l.height)).toEqual([48, 48, 48]);
    expect(r.lines.map((l) => l.pIdx)).toEqual([0, 1, 2]);
    const none = office(200, [para([]), para([run('B')])]);
    expect(none.lines[0].pIdx).toBe(0);
    expect(none.lines[0].height).toBeCloseTo(14.4, 2); // 1.2 × default 12
  });

  test('splitParagraphAtHardBreaks: source offsets, one empty piece per \\n\\n', () => {
    const pieces = splitParagraphAtHardBreaks(para([run('ab\n\ncd'), run('e\nf')], { whiteSpace: 'pre-wrap' }));
    expect(pieces.map((p) => p.sourceStart)).toEqual([0, 3, 4, 8]);
    expect(pieces.map((p) => p.endsWithBreak)).toEqual([true, true, true, false]);
    expect(pieces[1].paragraph.children).toEqual([expect.objectContaining({ text: '' })]);
  });
});

describe.skipIf(!REAL_ARIAL)('decorations — PowerPoint geometry from the font (office)', () => {
  // Arial: post underlinePosition −217, underlineThickness 150; OS/2 strikeout 530 / 102 (per 2048 em)
  const em = (u: number, size: number) => (u / 2048) * size;
  const rules = (l: Line, kind: 'underline' | 'strikethrough') => (l.decorations ?? []).filter((d) => d.kind === kind);

  test('underline top = baseline + |underlinePosition|, thickness from post (u-big-arial 144: +15.12 / 11)', () => {
    const l = office(700, [para([run('Hxg 144', { fontSize: 144, underline: true })])]).lines[0];
    const [u] = rules(l, 'underline');
    expect(u.y - l.baseline).toBeCloseTo(em(217, 144), 1);
    expect(u.thickness).toBeCloseTo(em(150, 144), 1);
  });

  test('one rule per underlined stretch, at the advance-weighted size (u-mix-big-first: 7.04 / 5)', () => {
    const l = office(700, [para([run('B', { fontSize: 100, underline: true }), run(' small text', { fontSize: 10, underline: true })])]).lines[0];
    const u = rules(l, 'underline');
    expect(u.length).toBe(1);
    expect(u[0].y - l.baseline).toBeGreaterThan(6.5);
    expect(u[0].y - l.baseline).toBeLessThan(7.2);
    expect(u[0].thickness).toBeCloseTo(4.67, 1);
  });

  test('strikethrough per run at its own size (k-mix: −25.96 / 5 and −2.96 / 1)', () => {
    const l = office(700, [para([run('B', { fontSize: 100, strikethrough: true }), run(' small text', { fontSize: 10, strikethrough: true })])]).lines[0];
    const k = rules(l, 'strikethrough');
    expect(k.length).toBe(2);
    expect(k[0].y - l.baseline).toBeCloseTo(-em(530, 100), 1);
    expect(k[1].y - l.baseline).toBeCloseTo(-em(530, 10), 1);
  });

  test('no rule under the spaces a line ends with (u-wrap-trailing: 0…75)', () => {
    const r = office(120, [para([run('underlined words that wrap here', { underline: true })])]);
    const [u] = rules(r.lines[0], 'underline');
    expect(u.x + u.width).toBeCloseTo(74.5, 0);
  });

  test('browser mode leaves decoration geometry to the renderer', () => {
    const r = layoutTextFrame({ width: 300, wrap: true, paragraphs: [para([run('x', { underline: true })])] }, { mode: 'browser' });
    expect(r.lines[0].decorations).toBeUndefined();
  });
});

describe.skipIf(!REAL_ARIAL)('hyphenBreak', () => {
  const lines = (text: string, width: number, style: Partial<ParagraphStyle> = {}) =>
    office(width, [para([run(text, { fontSize: 20 })], style)]).lines.map(textOf);

  test('default breaks after the hyphen, in words and digits, as PowerPoint (h-0, h-3)', () => {
    expect(lines('state-of-the-art', 78)).toEqual(['state-of-', 'the-art']);
    expect(lines('2024-10-06', 61)).toEqual(['2024-', '10-06']);
  });

  test('hyphenBreak: false keeps hyphenated words and codes together', () => {
    expect(lines('2024-10-06', 61, { hyphenBreak: false })).toEqual(['2024-10-06']);
    expect(lines('call TEST-1234 now', 110)).toEqual(['call TEST-', '1234 now']);
    expect(lines('call TEST-1234 now', 110, { hyphenBreak: false })).toEqual(['call ', 'TEST-1234 ', 'now']);
  });
});

// a-center-indent: marL 40, indent +20, centred, 240 pt box — PowerPoint wraps
// each line inside its indents (vyaz used to wrap at the full box width).
describe.skipIf(!REAL_ARIAL)('paragraph indent — lines wrap inside the indents (PowerPoint)', () => {
  test('a-center-indent: PowerPoint line breaks and ink edges', () => {
    const r = office(240, [para([run(PARA)], { alignment: 'center', leftIndent: 40, indent: 20 })]);
    expect(r.lines.map(textOf)).toEqual([
      'The quick brown fox ', 'jumps over the lazy dog ', 'while a frame measures ',
      'every line box and decides ', 'where each word wraps ', 'inside the given rectangle.',
    ]);
    const ppt = [221.57, 224.51, 224.93, 234.63, 224.43, 232.88];
    r.lines.forEach((l, i) => expect(Math.abs(inkRight(l) - ppt[i])).toBeLessThanOrEqual(0.02));
  });
});

// x-super / x-sub / x-size* / x-pct30: PowerPoint's Superscript / Subscript
// (`baseline` 30000 / −25000) — 2/3 size exactly (object-model widths), shift
// by the percentage of the full size (PDF: 30 % of 96 pt = 28.8 pt).
describe('super / subscript — PowerPoint model (office)', () => {
  const spansOf = (script: 'super' | 'sub', size: number) => {
    const r = layoutTextFrame({ width: 600, wrap: true, paragraphs: [para([run('H', { fontFamily: 'Unifont', fontSize: size }), run('2', { fontFamily: 'Unifont', fontSize: size, script })])] }, { mode: 'office' });
    return r.lines[0].spans.filter((s) => s.type === 'text');
  };

  test('2/3 of the run size, 30 % up / 25 % down of the full size', () => {
    for (const size of [13, 24, 96]) {
      const [, sup] = spansOf('super', size);
      expect(sup.fontMetrics.fontSize).toBeCloseTo(size * 2 / 3, 5);
      expect(sup.fontMetrics.baselineOffset!).toBeCloseTo(-0.3 * size, 5);
      const [, sub] = spansOf('sub', size);
      expect(sub.fontMetrics.fontSize).toBeCloseTo(size * 2 / 3, 5);
      expect(sub.fontMetrics.baselineOffset!).toBeCloseTo(0.25 * size, 5);
    }
  });

  test('browser keeps its own model (0.65, 40 % up)', () => {
    const r = layoutTextFrame({ width: 600, wrap: true, paragraphs: [para([run('H', { fontFamily: 'Unifont' }), run('2', { fontFamily: 'Unifont', script: 'super' })])] }, { mode: 'browser' });
    const sup = r.lines[0].spans.filter((s) => s.type === 'text')[1];
    expect(sup.fontMetrics.fontSize).toBeCloseTo(16 * 0.65, 5);
    expect(sup.fontMetrics.baselineOffset!).toBeCloseTo(-0.4 * 16, 5);
  });

  test.skipIf(!REAL_ARIAL)('x-size13: a 2/3-size digit is as wide as PowerPoint draws it (4.88 pt)', () => {
    const r = office(600, [para([run('0000', { fontSize: 13 }), run('0000', { fontSize: 13, script: 'super' })])]);
    const sup = r.lines[0].spans.filter((s) => s.type === 'text')[1];
    expect(sup.width / 4).toBeCloseTo(4.875, 2);
  });
});

// x-wrap: a run that starts after a pre-wrap space must move to the next line
// whole, not be split by overflowWrap: 'break-word' (vendored pretext patch).
describe('pre-wrap + break-word: wrap before the next run, never inside it', () => {
  test('"wrap " | "sub" — "sub" moves whole', () => {
    for (const script of [undefined, 'sub', 'super'] as const) {
      const r = layoutTextFrame({
        width: 160, wrap: true,
        paragraphs: [para([run('more words to wrap '), run('sub', script ? { script } : {}), run(' and end.')], { whiteSpace: 'pre-wrap', overflowWrap: 'break-word' })],
      }, { mode: 'office' });
      expect(r.lines.map(textOf)[1].startsWith('sub')).toBe(true);
    }
  });
});
