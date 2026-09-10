/**
 * layout-mode.test.ts — `mode` as a per-layout input (not global setMode).
 *
 * Office (DrawingML) uses OS/2 winAscent/winDescent and a no-leading line box;
 * browser uses hhea + CSS leading. For the same frame the line height differs.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { registerUnifont, registerFixtureFonts, makeTextFrame, makeParagraph } from './helpers.ts';
import { layoutTextFrame } from '../src/layout/TextFrameLayoutEngine.js';
import { fontMetricsProvider } from '../src/measure/FontMetricsProvider.js';
import type { Paragraph, TextFrame } from '../src/types/Document.js';

beforeAll(async () => {
  await registerUnifont();
  await registerFixtureFonts();
});

const frame = () =>
  makeTextFrame([makeParagraph('Hello Office', { fontFamily: 'Unifont', fontSize: 20 })], { width: 400 });

describe('layout mode', () => {
  test('office and browser give different line geometry, same frame', () => {
    const b = layoutTextFrame(frame(), { mode: 'browser' });
    const o = layoutTextFrame(frame(), { mode: 'office' });
    expect(o.lines[0].height).not.toBe(b.lines[0].height);
  });

  test('default (no mode) equals explicit browser', () => {
    const def = layoutTextFrame(frame());
    const brs = layoutTextFrame(frame(), { mode: 'browser' });
    expect(JSON.stringify(def.lines)).toBe(JSON.stringify(brs.lines));
  });

  test('per-call mode does not mutate the provider global', () => {
    const before = fontMetricsProvider.getMode();
    layoutTextFrame(frame(), { mode: 'office' });
    expect(fontMetricsProvider.getMode()).toBe(before);
  });
});

// ── office line spacing (DrawingML <a:lnSpc><a:spcPct>) ────────────────
// Regression cover for the fix: mode:'office' used to drop style.lineHeight
// entirely (line box == winAscent+winDescent for every spcPct). PowerPoint
// SVG exports (packages/renderers/tests/office-cases/*/powerpoint.svg) show the
// line box scaling linearly with spcPct; the extra room from spcPct > 1 sits
// ~0.75 above the baseline. See office-cases/MIGRATION.md.
describe('office line spacing (spcPct)', () => {
  const WRAP = 'Roboto office line spacing sample that wraps onto several lines here';

  const para = (lineHeight: number, fontSize = 18, text = WRAP): Paragraph => ({
    style: { alignment: 'left', lineHeight, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal' },
    children: [{ type: 'text', text, fontFamily: 'Roboto', fontSize } as any],
  });
  const frameOf = (...ps: Paragraph[]): TextFrame => ({ wrap: true, width: 200, paragraphs: ps });
  const office = (lineHeight: number) => layoutTextFrame(frameOf(para(lineHeight)), { mode: 'office' });
  const pitch = (lh: number) => {
    const L = office(lh).lines;
    return (L[1].y + L[1].baseline) - (L[0].y + L[0].baseline);
  };

  test('the line box scales linearly with spcPct (1.0 / 1.5 / 2.0)', () => {
    const h1 = office(1.0).lines[0].height;
    expect(office(1.5).lines[0].height / h1).toBeCloseTo(1.5, 2);
    expect(office(2.0).lines[0].height / h1).toBeCloseTo(2.0, 2);
  });

  test('baseline-to-baseline pitch scales linearly with spcPct', () => {
    const p1 = pitch(1.0);
    expect(pitch(1.5) / p1).toBeCloseTo(1.5, 2);
    expect(pitch(2.0) / p1).toBeCloseTo(2.0, 2);
  });

  test('spcPct 1.0 is the single-spaced box: height == ascent+descent, baseline == round(ascent)', () => {
    const l = office(1.0).lines[0];
    expect(l.height).toBeCloseTo(l.ascent + l.descent, 1);
    expect(l.baseline).toBe(Math.round(l.ascent));
  });

  test('extra leading from spcPct > 1 sits ~0.75 above the baseline', () => {
    const a = office(1.0).lines[0];
    const b = office(2.0).lines[0];
    const extra = b.height - a.height;
    expect(extra).toBeGreaterThan(a.height * 0.9);        // ~1× the box was added
    expect(b.baseline - a.baseline).toBeCloseTo(extra * 0.75, 1);
  });

  test('browser mode is unaffected — its own CSS leading model, different geometry', () => {
    const o = layoutTextFrame(frameOf(para(2.0)), { mode: 'office' }).lines[0];
    const br = layoutTextFrame(frameOf(para(2.0)), { mode: 'browser' }).lines[0];
    expect(Math.abs(o.height - br.height)).toBeGreaterThan(1);
  });

  test('each paragraph keeps its own spcPct when stacked in one frame', () => {
    const single = office(1.0).lines.length; // lines per paragraph (same text/width)
    const stacked = layoutTextFrame(frameOf(para(1.0), para(2.0)), { mode: 'office' }).lines;
    const p1Pitch = stacked[1].height;             // paragraph 1 line box (spcPct 1.0)
    const p2Pitch = stacked[single].height;        // paragraph 2's first line box (spcPct 2.0)
    expect(p2Pitch / p1Pitch).toBeCloseTo(2.0, 2);
  });

  test('multi-size line: the box follows the line max run size, then × spcPct', () => {
    const mixed: Paragraph = {
      style: { alignment: 'left', lineHeight: 1.5, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal' },
      children: [
        { type: 'text', text: 'small ', fontFamily: 'Roboto', fontSize: 18 } as any,
        { type: 'text', text: 'BIG', fontFamily: 'Roboto', fontSize: 36 } as any,
      ],
    };
    const noWrap = (p: Paragraph) => layoutTextFrame({ wrap: false, paragraphs: [p] }, { mode: 'office' }).lines[0];
    const big36 = (lh: number): Paragraph => para(lh, 36, 'BIG');

    // line with an 18 + a 36 run == a line with just the 36 run (max run wins)
    expect(noWrap(mixed).height).toBeCloseTo(noWrap(big36(1.5)).height, 1);
    // and that box is 1.5× the single-spaced 36pt box
    expect(noWrap(big36(1.5)).height / noWrap(big36(1.0)).height).toBeCloseTo(1.5, 2);
  });
});
