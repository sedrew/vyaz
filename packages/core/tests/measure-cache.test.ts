/**
 * measure-cache.test.ts — shaped widths are cached across layouts and profiles.
 *
 * `mode: 'office'` installs its measure profile around every `layoutTextFrame()`
 * call and restores the previous one after. Widths measured under a profile
 * must survive that round trip (no re-shaping the same word per text box) and
 * must never be served to a layout running under a different profile.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { registerFixtureFonts } from './helpers.ts';
import { layoutTextFrame, fontMetricsProvider, measurePx, clearMeasureCache } from '@vyaz/core';
import type { MeasureProfile } from '../src/measure/FontkitMeasureContext.js';
import type { LayoutOptions } from '../src/layout/TextFrameLayoutEngine.js';

beforeAll(async () => {
  await registerFixtureFonts();
});

/** GreatVibes kerns through GPOS only: office shapes it unkerned, `shaping: true` kerns it. */
const raw = (): any => fontMetricsProvider.getFont('GreatVibes', 'normal', 'normal')!._raw;

/** Count fontkit `layout()` calls on the fixture font while `fn` runs. */
function countShaping(fn: () => void): number {
  const font = raw();
  const original = font.layout;
  let calls = 0;
  font.layout = function (...args: unknown[]) {
    calls++;
    return original.apply(this, args);
  };
  try {
    fn();
  } finally {
    font.layout = original;
  }
  return calls;
}

const frame = (text: string, width = 90) => ({
  width,
  wrap: true,
  paragraphs: [
    {
      style: { alignment: 'left' as const },
      children: [{ type: 'text' as const, text, fontFamily: 'GreatVibes', fontSize: 24, color: '#000' }],
    },
  ],
});

const widths = (text: string, options: LayoutOptions) =>
  layoutTextFrame(frame(text), options).lines.map((l) => l.spans.map((s) => s.width));

describe('measurePx shaped-width cache', () => {
  const shape: MeasureProfile = { engine: 'shape' };
  const noKern: MeasureProfile = { engine: 'shape', features: { kern: false } };

  test('a repeated measurement shapes once and returns the same width', () => {
    clearMeasureCache();
    const font = raw();
    const scale = 24 / font.unitsPerEm;
    let first = 0;
    let second = 0;
    const calls = countShaping(() => {
      first = measurePx(font, scale, 24, 'Wave Tomato', shape);
      second = measurePx(font, scale, 24, 'Wave Tomato', shape);
    });
    expect(calls).toBe(1);
    expect(second).toBe(first);
  });

  test('profile and size are part of the key', () => {
    clearMeasureCache();
    const font = raw();
    const at = (size: number, prof: MeasureProfile) => measurePx(font, size / font.unitsPerEm, size, 'Wave Tomato', prof);
    const kerned = at(24, shape);
    const unkerned = at(24, noKern);
    expect(unkerned).not.toBe(kerned);
    expect(at(24, shape)).toBe(kerned);
    expect(at(24, noKern)).toBe(unkerned);
    expect(at(12, shape)).toBeCloseTo(kerned / 2, 6);
    // same profile by value, different object → same entry
    expect(countShaping(() => at(24, { engine: 'shape' }))).toBe(0);
  });

  test('clearMeasureCache() forces a re-measure', () => {
    const font = raw();
    const scale = 24 / font.unitsPerEm;
    measurePx(font, scale, 24, 'Wave', shape);
    clearMeasureCache();
    expect(countShaping(() => measurePx(font, scale, 24, 'Wave', shape))).toBe(1);
  });
});

describe('office layouts reuse widths across calls', () => {
  // width 90 puts one word per line, so every measured fragment is a single word
  test('a second text box with the same words shapes nothing', () => {
    clearMeasureCache();
    layoutTextFrame(frame('Wave Tomato Avocado Wave'), { mode: 'office' });
    // different paragraph (prepared-line cache miss), same vocabulary
    const calls = countShaping(() => {
      layoutTextFrame(frame('Tomato Wave Avocado Tomato'), { mode: 'office' });
    });
    expect(calls).toBe(0);
  });

  test('profiles interleaved on the same text never cross-feed', () => {
    const text = 'Wave Tomato Avocado Wave Tomato';
    const kerned = widths(text, { mode: 'office', shaping: true });
    const office = widths(text, { mode: 'office' });
    const plain = widths(text, {});
    expect(office).not.toEqual(kerned);
    expect(plain).not.toEqual(office);
    for (let i = 0; i < 2; i++) {
      expect(widths(text, {})).toEqual(plain);
      expect(widths(text, { mode: 'office', shaping: true })).toEqual(kerned);
      expect(widths(text, { mode: 'office' })).toEqual(office);
    }
  });
});
