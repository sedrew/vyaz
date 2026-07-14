/**
 * Tests for estimateWidth.ts:
 *   - correctToSumInvariant — sum == occupiedWidth
 *   - resolveFragmentWidths with fontkit (exact measurement)
 *   - resolveFragmentWidths without fontkit (weight-based fallback)
 *   - fallback + invariant together: sum == occupiedWidth
 */
import { describe, expect, test } from 'vitest';
import { resolveFragmentWidths, correctToSumInvariant } from '../src/layout/estimateWidth.js';

// ── correctToSumInvariant ────────────────────────────────────────────

describe('correctToSumInvariant', () => {
  test('returns widths unchanged when sum already matches occupiedWidth', () => {
    const widths = [10, 20, 30];
    const result = correctToSumInvariant(widths, 60);
    expect(result).toEqual([10, 20, 30]);
  });

  test('corrects widths to sum to occupiedWidth', () => {
    const widths = [10, 20, 30]; // sum = 60
    const result = correctToSumInvariant(widths, 66);
    // delta = 6, distributed: 10/60*6=1, 20/60*6=2, 30/60*6=3
    expect(result[0]).toBeCloseTo(11, 5);
    expect(result[1]).toBeCloseTo(22, 5);
    expect(result[2]).toBeCloseTo(33, 5);
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(66, 5);
  });

  test('handles negative delta (over-measured fragments)', () => {
    const widths = [12, 22, 34]; // sum = 68
    const result = correctToSumInvariant(widths, 60);
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(60, 5);
  });

  test('returns empty array for empty input', () => {
    const result = correctToSumInvariant([], 100);
    expect(result).toEqual([]);
  });

  test('when sum is 0, returns unchanged (no division by zero)', () => {
    const result = correctToSumInvariant([0, 0, 0], 100);
    expect(result).toEqual([0, 0, 0]);
  });

  test('tolerance: difference < 0.001 is accepted as-is', () => {
    const widths = [33.3333, 33.3334, 33.3333]; // sum = 99.99999999999999, delta ~= 0
    const result = correctToSumInvariant(widths, 100);
    expect(result).toEqual(widths);
  });

  test('single width — returns as-is (no correction needed)', () => {
    const result = correctToSumInvariant([42], 42);
    expect(result).toEqual([42]);
  });
});

// ── resolveFragmentWidths ─────────────────────────────────────────────

describe('resolveFragmentWidths', () => {
  test('single fragment — returns occupiedWidth as-is', () => {
    const result = resolveFragmentWidths(['hello'], 'hello', 100);
    expect(result).toEqual([100]);
  });

  test('multiple fragments — distributes by weight-based fallback', () => {
    // " between form" → [" ", "between", " form"]
    // weights: ' '=0.35, 'between'(7×1.0)=7.0, ' form'(space=0.35 + 4×1.0=4.0)=4.35
    // total = 0.35 + 7.0 + 4.35 = 11.7
    // "between" = 7.0 / 11.7 * 100 ≈ 59.83
    // " form" = 4.35 / 11.7 * 100 ≈ 37.18
    // leading " " = 0.35 / 11.7 * 100 ≈ 2.99
    const result = resolveFragmentWidths(
      [' ', 'between', ' form'],
      ' between form',
      100,
    );
    expect(result).toHaveLength(3);
    // Sum must equal occupiedWidth
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
    // "between" should get > 50px (wider than naive 7/13*100=53.8)
    expect(result[1]).toBeGreaterThan(55);
    // Leading space should get < 3px (narrower than naive 1/13*100=7.7)
    expect(result[0]).toBeLessThan(4);
  });

  test('weight-based fallback gives better result than charCount/totalChars', () => {
    // Naive: "between" = 7/13 * 100 ≈ 53.8px
    // Weight-based: "between" = 7.0/11.7 * 100 ≈ 59.8px
    // Real font measurement would be closer to 60+ for proportional font
    const result = resolveFragmentWidths(
      [' ', 'between', ' form'],
      ' between form',
      100,
    );
    const naiveWidth = (7 / 13) * 100;
    expect(result[1]).toBeGreaterThan(naiveWidth);
  });

  test('empty fragments returns empty array', () => {
    const result = resolveFragmentWidths([], '', 100);
    expect(result).toEqual([]);
  });

  test('occupuesWidth = 0 returns zeros', () => {
    const result = resolveFragmentWidths(['a', 'b'], 'ab', 0);
    expect(result).toEqual([0, 0]);
  });

  test('empty fragment string returns 0 for that fragment', () => {
    const result = resolveFragmentWidths(['', 'hello', ''], ' hello ', 100);
    expect(result).toHaveLength(3);
    expect(result[1]).toBeGreaterThan(0);
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
  });
});

// ── resolveFragmentWidths with measureFn ─────────────────────────────

describe('resolveFragmentWidths with measureFn', () => {
  test('uses measureFn when available and returns non-negative', () => {
    const result = resolveFragmentWidths(
      [' ', 'between', ' form'],
      ' between form',
      100,
      (text) => text === 'between' ? 60 : text === ' form' ? 35 : 5,
    );
    expect(result).toHaveLength(3);
    // Sum should equal occupiedWidth (via correction)
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
  });

  test('falls back to weight-based when measureFn returns -1', () => {
    const result = resolveFragmentWidths(
      [' ', 'between', ' form'],
      ' between form',
      100,
      () => -1,
    );
    expect(result).toHaveLength(3);
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
    // Should be same as weight-based fallback
    const fallbackResult = resolveFragmentWidths(
      [' ', 'between', ' form'],
      ' between form',
      100,
    );
    expect(result).toEqual(fallbackResult);
  });

  test('correction applied after measurement provides sum == occupiedWidth', () => {
    // Simulate fontkit measurement that doesn't sum to occupiedWidth
    // due to kerning differences
    const result = resolveFragmentWidths(
      [' ', 'between', ' form'],
      ' between form',
      100,
      (text) => {
        if (text === ' ') return 3;
        if (text === 'between') return 58;
        if (text === ' form') return 36;
        return 0;
      },
    );
    // Raw sum = 3 + 58 + 36 = 97, delta = +3
    // After correction: ~3.09 + 59.79 + 37.11 = 100
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
    // Each fragment should differ from raw measurement
    expect(result[0]).toBeGreaterThan(3); // 3 → 3.09
    expect(result[1]).toBeGreaterThan(58); // 58 → 59.79
  });
});