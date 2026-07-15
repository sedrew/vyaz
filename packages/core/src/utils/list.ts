/**
 * list.ts — helper utilities for list marker generation.
 *
 * Provides:
 * - `formatListNumber()` — format a number according to `NumberFormat`
 * - `defaultBulletChar()` — pick a bullet character based on nesting level
 * - `BULLET_CHARACTERS` — the Unicode characters for disc/circle/square
 */

import type { NumberFormat } from '../types/Document.js';

/**
 * Unicode characters used for CSS `disc`, `circle`, `square` list-style-type
 * values at different nesting levels.
 *
 * @see {@link https://www.w3.org/TR/css-lists-3/#ua-stylesheet | CSS Lists UA defaults}
 */
export const BULLET_CHARACTERS: Record<number, string> = {
  0: '\u2022', // • BULLET  (disc)
  1: '\u25CB', // ○ WHITE CIRCLE (circle)
  2: '\u25AA', // ▪ BLACK SMALL SQUARE (square)
};

/** Fallback for deeper levels — same as level 2 */
const FALLBACK_BULLET = '\u25AA';

/**
 * Get the default bullet character for a given nesting level.
 *
 * CSS UA stylesheet uses:
 * - Level 0 (ul): disc (•)
 * - Level 1 (ul ul): circle (○)
 * - Level 2+ (ul ul ul): square (▪)
 */
export function defaultBulletChar(level: number): string {
  return BULLET_CHARACTERS[level] ?? FALLBACK_BULLET;
}

/**
 * Format a number according to the given numbering format.
 *
 * Supports the same formats as CSS `list-style-type`:
 * - `decimal`: 1, 2, 3, …
 * - `upper-roman`: I, II, III, …
 * - `lower-roman`: i, ii, iii, …
 * - `upper-alpha`: A, B, C, …
 * - `lower-alpha`: a, b, c, …
 *
 * Follows CSS Counter Styles Level 3 algorithms.
 * Roman numerals support the range 1–3999.
 *
 * @see {@link https://www.w3.org/TR/css-counter-styles-3/ | CSS Counter Styles Level 3}
 */
export function formatListNumber(n: number, format: NumberFormat): string {
  switch (format) {
    case 'decimal':
      return String(n);
    case 'upper-roman':
      return toRoman(n).toUpperCase();
    case 'lower-roman':
      return toRoman(n).toLowerCase();
    case 'upper-alpha':
      return toAlpha(n).toUpperCase();
    case 'lower-alpha':
      return toAlpha(n).toLowerCase();
    default:
      return String(n);
  }
}

/**
 * Convert 1-based integer to lowercase roman numeral.
 * Supports 1–3999.
 */
function toRoman(n: number): string {
  if (n < 1 || n > 3999) return String(n);
  const romanMap: [number, string][] = [
    [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'],
    [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'],
    [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
  ];
  let result = '';
  for (const [value, symbol] of romanMap) {
    while (n >= value) {
      result += symbol;
      n -= value;
    }
  }
  return result;
}

/**
 * Convert 1-based integer to alpha format (a, b, c, …, z, aa, ab, …).
 * Uses the same algorithm as CSS `lower-alpha` (CSS Counter Styles §3.1.2).
 */
function toAlpha(n: number): string {
  if (n < 1) return String(n);
  const base = 26;
  const offset = 'a'.charCodeAt(0);
  let result = '';
  while (n > 0) {
    n--;
    result = String.fromCharCode(offset + (n % base)) + result;
    n = Math.floor(n / base);
  }
  return result;
}