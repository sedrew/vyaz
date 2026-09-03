/**
 * autofit-option.test.ts — layoutTextFrame(frame, { autofit }).
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { registerUnifont, makeParagraph, makeTextFrame } from './helpers.ts';
import { layoutTextFrame } from '../src/layout/TextFrameLayoutEngine.js';

beforeAll(async () => {
  await registerUnifont();
});

const big = () =>
  makeTextFrame(
    Array.from({ length: 10 }, () => makeParagraph('The quick brown fox jumps', { fontFamily: 'Unifont', fontSize: 24 })),
    { width: 300, height: 120 },
  );

describe('autofit option', () => {
  test('content already fits → scale 1, not clamped', () => {
    const frame = makeTextFrame([makeParagraph('Hi', { fontFamily: 'Unifont', fontSize: 12 })], {
      width: 400,
      height: 200,
    });
    const r = layoutTextFrame(frame, { autofit: true });
    expect(r.autofit).toEqual({ scale: 1, clampedToMin: false });
    expect(r.overflow.vertical).toBe(false);
  });

  test('overflowing content → scale < 1 and result fits', () => {
    const r = layoutTextFrame(big(), { autofit: true });
    expect(r.autofit!.scale).toBeLessThan(1);
    expect(r.autofit!.clampedToMin).toBe(false);
    expect(r.content.height).toBeLessThanOrEqual(120 + 0.5);
    expect(r.overflow.vertical).toBe(false);
  });

  test('minFontSize floor that still overflows → clampedToMin', () => {
    // 24px * (20/24) = 20px min → still way too much text for a 120px box
    const r = layoutTextFrame(big(), { autofit: { minFontSize: 20 } });
    expect(r.autofit!.clampedToMin).toBe(true);
    expect(r.autofit!.scale).toBeCloseTo(20 / 24, 2);
  });

  test('no autofit option → result.autofit is undefined', () => {
    const r = layoutTextFrame(big());
    expect(r.autofit).toBeUndefined();
  });
});
