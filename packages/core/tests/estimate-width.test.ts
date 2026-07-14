/**
 * Tests for estimateWidth.ts:
 *   - correctToSumInvariant — sum == occupiedWidth
 *   - resolveFragmentWidths with fontkit (exact measurement)
 *   - resolveFragmentWidths without fontkit (weight-based fallback)
 *   - fallback + invariant together: sum == occupiedWidth
 */
import { describe, expect, test } from 'vitest';
import { resolveFragmentWidths, correctToSumInvariant, type MeasureFn } from '../src/layout/estimateWidth.js';

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
  const simpleMeasureFn: MeasureFn = (text) => text.length * 10;

  test('single fragment — returns occupiedWidth as-is', () => {
    const result = resolveFragmentWidths(['hello'], 'hello', 100, simpleMeasureFn);
    expect(result).toEqual([100]);
  });

  test('multiple fragments — distributes by measureFn', () => {
    const result = resolveFragmentWidths(
      [' ', 'between', ' form'],
      ' between form',
      100,
      (text) => {
        if (text === ' ') return 2;
        if (text === 'between') return 60;
        if (text === ' form') return 35;
        return 0;
      },
    );
    expect(result).toHaveLength(3);
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
  });

  test('empty fragments returns empty array', () => {
    const result = resolveFragmentWidths([], '', 100, simpleMeasureFn);
    expect(result).toEqual([]);
  });

  test('correctToSumInvariant corrects widths to sum to occupiedWidth', () => {
    const result = resolveFragmentWidths(
      ['a', 'b'],
      'ab',
      100,
      (text) => text === 'a' ? 40 : 40, // sum = 80, delta = 20
    );
    expect(result).toHaveLength(2);
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
  });

  test('empty fragment string returns 0 for that fragment', () => {
    const result = resolveFragmentWidths(['', 'hello', ''], ' hello ', 100, (text) => {
      if (text === 'hello') return 80;
      return 0;
    });
    expect(result).toHaveLength(3);
    // Empty fragments get 0, 'hello' absorbs the correction delta
    // raw: [0, 80, 0] → sum=80 → delta=20 → corrected: [0, 100, 0]
    expect(result[0]).toBe(0);
    expect(result[1]).toBeCloseTo(100, 5);
    expect(result[2]).toBe(0);
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
  });
});

// ── resolveFragmentWidths with measureFn ─────────────────────────────

describe('resolveFragmentWidths with measureFn', () => {
  test('uses measureFn and returns non-negative', () => {
    const result = resolveFragmentWidths(
      [' ', 'between', ' form'],
      ' between form',
      100,
      (text) => text === 'between' ? 60 : text === ' form' ? 35 : 5,
    );
    expect(result).toHaveLength(3);
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
  });


  test('correction applied after measurement provides sum == occupiedWidth', () => {
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
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
    expect(result[0]).toBeGreaterThan(3);
    expect(result[1]).toBeGreaterThan(58);
  });
});
