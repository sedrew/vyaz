/**
 * autofit-option.test.ts — layoutTextFrame(frame, { autofit }).
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { registerUnifont, makeParagraph, makeTextFrame } from './helpers.ts';
import { layoutTextFrame } from '../src/layout/TextFrameLayoutEngine.js';
import { applyScale } from '../src/layout/AutoFitEngine.js';

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
    // 24px * (20/24) = 20px min → still way too much text for a 120px box.
    // The floor rounds up to the 1% fontScale grid (0.8333 → 0.84), so the clamped
    // layout stays at or above minFontSize instead of dipping under it.
    const r = layoutTextFrame(big(), { autofit: { minFontSize: 20 } });
    expect(r.autofit!.clampedToMin).toBe(true);
    expect(r.autofit!.scale).toBe(0.84);
    for (const span of r.lines.flatMap((l) => l.spans)) {
      expect(span.style.fontSize).toBeGreaterThanOrEqual(20);
    }
  });

  test('the reported scale is on the 1% fontScale grid and was applied as-is', () => {
    const r = layoutTextFrame(big(), { autofit: true });
    const scale = r.autofit!.scale;
    expect(Math.abs(scale * 100 - Math.round(scale * 100))).toBeLessThan(1e-6);
    // Re-scaling the source frame by the reported scale reproduces the same content.
    const again = layoutTextFrame(applyScale(big(), scale), { autofit: undefined });
    expect(again.content).toEqual(r.content);
  });

  test('no autofit option → result.autofit is undefined', () => {
    const r = layoutTextFrame(big());
    expect(r.autofit).toBeUndefined();
  });
});
