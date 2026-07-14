/**
 * textTransform.ts — pure text transformation functions.
 *
 * Implements CSS `text-transform` for: none, uppercase, lowercase, capitalize.
 *
 * Explicit capitalization contract (edge cases):
 * - Apostrophe (') is NOT a word boundary: "don't stop" → "Don't Stop"
 * - Hyphen (-) IS a word boundary: "hello-world" → "Hello-World"
 * - Leading whitespace is preserved: "  hello" → "  Hello"
 * - Numbers are not capitalized: "3d model" → "3d Model"
 * - Unicode full-range: first `\p{L}` in each word segment gets .toUpperCase()
 * - Empty string → ""
 * - No letters → unchanged: "123" → "123"
 *
 * @see {@link https://www.w3.org/TR/css-text-3/#text-transform-property | CSS Text: text-transform}
 */

import type { TextTransform } from '../types/Document.js';

/**
 * Apply text-transform to a string.
 *
 * @param text — input text
 * @param transform — transform type ('none' | 'uppercase' | 'lowercase' | 'capitalize')
 * @returns transformed text
 *
 * @example
 * ```ts
 * transformText("hello world", 'uppercase')  // → "HELLO WORLD"
 * transformText("HELLO", 'lowercase')         // → "hello"
 * transformText("don't stop", 'capitalize')   // → "Don't Stop"
 * ```
 */
export function transformText(text: string, transform?: TextTransform): string {
  if (!transform || transform === 'none' || !text) {
    return text;
  }

  switch (transform) {
    case 'uppercase':
      return text.toUpperCase();

    case 'lowercase':
      return text.toLowerCase();

    case 'capitalize': {
      // Capitalize first letter of each word.
      // Word = sequence of Unicode letters (\p{L}).
      // Non-letter characters (including hyphen, but NOT apostrophe) are delimiters.
      //
      // Strategy: split on non-letter sequences (\P{L}+), but preserve delimiters
      // by using a capturing group. Then for each letter-segment, capitalize its first \p{L}.
      // Non-letter segments pass through unchanged.
      //
      // The regex splits on non-letters (excluding apostrophe) but keeps delimiters.
      // Apostrophe (') is NOT a word boundary: "don't stop" → ["don't", " ", "stop", ""]
      // Hyphen IS: "hello-world" → ["hello", "-", "world", ""]
      const segments = text.split(/([^\p{L}']+)/u);

      // Pre-allocate with same length
      const result: string[] = new Array(segments.length);

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (!seg) {
          result[i] = seg;
          continue;
        }

        // If this segment is a non-letter (excluding apostrophe) delimiter — pass through unchanged
        if (/^[^\p{L}']+$/u.test(seg)) {
          result[i] = seg;
          continue;
        }

        // This is a letter-segment. Capitalize its first letter.
        const firstLetter = seg.match(/\p{L}/u);
        if (!firstLetter) {
          result[i] = seg;
          continue;
        }

        const idx = firstLetter.index!;
        const before = seg.slice(0, idx);
        const letter = seg[idx].toUpperCase();
        const after = seg.slice(idx + 1);
        result[i] = `${before}${letter}${after}`;
      }

      return result.join('');
    }

    default:
      return text;
  }
}