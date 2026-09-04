/**
 * layout-mode.test.ts — `mode` as a per-layout input (not global setMode).
 *
 * Office (DrawingML) line box is `(lnSpc% / 100) × 1.2 × maxRunSizeInLine` — a
 * font-independent 1.2 × font size at single spacing, calibrated against real
 * PowerPoint on macOS (see `scripts/office-metrics/`). Browser uses hhea + CSS
 * leading. For the same frame the line height differs.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { registerUnifont, registerFixtureFonts, makeTextFrame, makeParagraph } from './helpers.ts';
import { layoutTextFrame } from '../src/layout/TextFrameLayoutEngine.js';
import { fontMetricsProvider } from '../src/measure/FontMetricsProvider.js';

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

describe('office line box = 1.2 × font size (font-independent)', () => {
  const single = (family: string, sizePx: number, lineHeight = 1) =>
    layoutTextFrame(
      makeTextFrame(
        [
          {
            style: { alignment: 'left', lineHeight, spaceBefore: 0, spaceAfter: 0 },
            children: [{ type: 'text', text: 'Xg', fontFamily: family, fontSize: sizePx, fontWeight: 'normal', fontStyle: 'normal', color: '#000' }],
          },
        ],
        { width: 800 },
      ),
      { mode: 'office' },
    ).lines[0];

  test('Roboto: single-spacing line ≈ 1.2 × size', () => {
    const l = single('Roboto', 20);
    expect(l.height).toBe(Math.round(1.2 * 20)); // 24
  });

  test('Great Vibes gets the SAME 1.2× box despite huge win metrics', () => {
    // winAscent+winDescent ≈ 1.75em for Great Vibes — the old ×1.078 model gave
    // ~1.9×; the calibrated model pins it to 1.2×.
    const l = single('GreatVibes', 28);
    expect(l.height).toBe(Math.round(1.2 * 28)); // 34
  });

  test('per-line height follows the largest run in the line', () => {
    const l = layoutTextFrame(
      makeTextFrame(
        [
          {
            style: { alignment: 'left', lineHeight: 1, spaceBefore: 0, spaceAfter: 0 },
            children: [
              { type: 'text', text: 'small ', fontFamily: 'Roboto', fontSize: 18, fontWeight: 'normal', fontStyle: 'normal', color: '#000' },
              { type: 'text', text: 'BIG', fontFamily: 'Roboto', fontSize: 36, fontWeight: 'normal', fontStyle: 'normal', color: '#000' },
            ],
          },
        ],
        { width: 800 },
      ),
      { mode: 'office' },
    ).lines[0];
    expect(l.height).toBe(Math.round(1.2 * 36)); // 43
  });

  test('lnSpc% rides on style.lineHeight', () => {
    const single100 = single('Roboto', 20, 1);
    const single150 = single('Roboto', 20, 1.5);
    expect(single150.height).toBe(Math.round(single100.height * 1.5));
  });
});
