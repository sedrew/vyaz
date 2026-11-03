/**
 * pretext-paragraph.test.ts — what vendored pretext 1.0 changed in line
 * breaking and measurement, as vyaz sees it.
 *
 *   - a paragraph's runs are laid out as one paragraph: a word split across
 *     runs wraps whole, and the collapsed space between runs belongs to the
 *     run that holds it in source (`gapItemIndex`);
 *   - an inline box is a box of its widget's width, a break opportunity on
 *     both sides like `<img>`;
 *   - with shaping, a line is as wide as the run shaped whole: kerning with
 *     the space counts (`AV`, `To`, `Yo` against the space in Roboto);
 *   - `wordBreak: 'keep-all'` keeps CJK words whole;
 *   - the shaped width of a text with a missing glyph is the same whole and
 *     in pieces (pretext reads any difference as kerning with the space).
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import type { Paragraph, ParagraphStyle, TextRun } from '../src/types/Document.js';
import type { Line } from '../src/types/LayoutTypes.js';
import { layoutTextFrame, fontMetricsProvider, measurePx } from '@vyaz/core';
import { registerFixtureFonts, registerUnifont } from './helpers.ts';

beforeAll(async () => {
  await registerUnifont();
  await registerFixtureFonts();
});

function para(children: Partial<TextRun>[], style: Partial<ParagraphStyle> = {}): Paragraph {
  return {
    style: { alignment: 'left', lineHeight: 1.2, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal', ...style },
    children: children.map((c) => ({ type: 'text', fontFamily: 'Roboto', fontSize: 16, ...c }) as TextRun),
  };
}

function lay(p: Paragraph, width: number, shaping = false): Line[] {
  return layoutTextFrame({ width, wrap: true, paragraphs: [p] }, { shaping }).lines;
}

function texts(lines: Line[]): string[] {
  return lines.map((l) => l.spans.map((s) => s.text).join('').trim());
}

/** A line's width without the spaces it ends with. */
function inkWidth(line: Line): number {
  return line.spans.filter((s) => !s.trailing).reduce((sum, s) => sum + s.width, 0);
}

/** Width of `text` laid out on one unbounded line. */
function natural(children: Partial<TextRun>[], style: Partial<ParagraphStyle> = {}): number {
  return inkWidth(lay(para(children, style), 100_000)[0]);
}

/** Shaped width of `text` (Roboto has no `opsz` axis, so no optical-size instance). */
function shapedPx(family: string, size: number, text: string): number {
  const font = fontMetricsProvider.getFont(family, '400', 'normal')!;
  return measurePx(font._raw, size / font.unitsPerEm, size, text, { engine: 'shape' });
}

describe('runs are one paragraph', () => {
  test('a word split across runs wraps whole, not at the run boundary', () => {
    const runs = [{ text: 'wrap su' }, { text: 'b', fontWeight: 700 }];
    // room for "wrap su", not for "wrap sub"
    const width = natural([{ text: 'wrap su' }]) + 0.5;
    expect(texts(lay(para(runs), width))).toEqual(['wrap', 'sub']);
  });

  test('punctuation that starts a run stays with the word before it', () => {
    // room for "one two", not for "one two,": the comma takes "two" along
    const runs = [{ text: 'one two' }, { text: ',', fontWeight: 700 }];
    const width = natural([{ text: 'one two' }]) + 0.5;
    expect(texts(lay(para(runs), width))).toEqual(['one', 'two,']);
  });
});

describe('collapsed space between runs (gapItemIndex)', () => {
  const spaceRun = (lines: Line[]) => lines[0].spans.find((s) => s.type === 'space')!.itemIndex;

  test('the space ending the first run is that run’s', () => {
    expect(spaceRun(lay(para([{ text: 'aa ' }, { text: 'bb' }]), 1000))).toBe(0);
  });

  test('the space starting the second run is that run’s', () => {
    expect(spaceRun(lay(para([{ text: 'aa' }, { text: ' bb' }]), 1000))).toBe(1);
  });

  test('a lone separator run owns its space', () => {
    expect(spaceRun(lay(para([{ text: 'aa' }, { text: ' ' }, { text: 'bb' }]), 1000))).toBe(1);
  });

  test('two spaces collapse into the first one', () => {
    // CSS keeps the first space of a collapsible run — the first run's
    expect(spaceRun(lay(para([{ text: 'aa ' }, { text: ' bb' }]), 1000))).toBe(0);
  });
});

describe('inline box', () => {
  const box = (width: number): Partial<TextRun> => ({
    type: 'inline-box',
    text: '',
    inlineWidget: { width, height: 10 } as TextRun['inlineWidget'],
  });

  test('takes exactly its widget’s width', () => {
    const line = lay(para([{ text: 'ab' }, box(40), { text: 'cd' }]), 1000)[0];
    const boxSpan = line.spans.find((s) => s.inlineWidget)!;
    expect(boxSpan.width).toBe(40);
    expect(boxSpan.text).toBe('￼');
    expect(inkWidth(line)).toBeCloseTo(natural([{ text: 'ab' }]) + 40 + natural([{ text: 'cd' }]), 2);
  });

  test('a line can break after a box that touches text', () => {
    const width = natural([{ text: 'ab' }]) + 40 + 0.5;
    const lines = lay(para([{ text: 'ab' }, box(40), { text: 'cd' }]), width);
    expect(texts(lines)).toEqual(['ab￼', 'cd']);
  });
});

describe('kerning with the space (shaping)', () => {
  test('a line is as wide as the run shaped whole', () => {
    const text = 'AVATAR Wave To Yo';
    const line = lay(para([{ text, fontSize: 32 }]), 1000, true)[0];
    const whole = shapedPx('Roboto', 32, text);
    expect(inkWidth(line)).toBeCloseTo(whole, 2);
    // and narrower than the words and spaces measured apart
    const apart = text.split(/( )/).reduce((sum, t) => sum + shapedPx('Roboto', 32, t), 0);
    expect(whole).toBeLessThan(apart - 0.3);
  });

  test('without shaping nothing kerns', () => {
    const text = 'AVATAR Wave To Yo';
    const line = lay(para([{ text, fontSize: 32 }]), 1000)[0];
    expect(inkWidth(line)).toBeCloseTo(natural([{ text, fontSize: 32 }]), 2);
  });
});

describe('missing glyph under shaping', () => {
  test('measures the same whole and in pieces', () => {
    // Roboto has no U+2192: both get the shared missing-glyph estimate
    expect(shapedPx('Roboto', 40, '→ ')).toBeCloseTo(shapedPx('Roboto', 40, '→') + shapedPx('Roboto', 40, ' '), 6);
  });
});

describe("wordBreak: 'keep-all'", () => {
  const korean = (style: Partial<ParagraphStyle> = {}) => para([{ text: '한국어 텍스트', fontFamily: 'Unifont' }], style);

  test('normal breaks Hangul between syllables', () => {
    const width = natural([{ text: '한국어 텍', fontFamily: 'Unifont' }]) + 0.5;
    expect(texts(lay(korean(), width))).toEqual(['한국어 텍', '스트']);
  });

  test('keep-all breaks only between words', () => {
    const width = natural([{ text: '한국어 텍', fontFamily: 'Unifont' }]) + 0.5;
    expect(texts(lay(korean({ wordBreak: 'keep-all' }), width))).toEqual(['한국어', '텍스트']);
  });
});
