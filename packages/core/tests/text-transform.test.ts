/**
 * text-transform.test.ts — pure function tests for transformText().
 *
 * Tests the contract specified in textTransform.ts:
 * - uppercase, lowercase, capitalize edge cases
 * - Unicode, apostrophe, hyphen, whitespace
 */

import { describe, test, expect } from 'bun:test';
import { transformText } from '../src/utils/textTransform.js';

describe('transformText — uppercase', () => {
  test('simple text', () => {
    expect(transformText('hello', 'uppercase')).toBe('HELLO');
  });

  test('already uppercase', () => {
    expect(transformText('HELLO', 'uppercase')).toBe('HELLO');
  });

  test('mixed case', () => {
    expect(transformText('Hello World', 'uppercase')).toBe('HELLO WORLD');
  });

  test('empty string', () => {
    expect(transformText('', 'uppercase')).toBe('');
  });

  test('numbers and symbols unchanged', () => {
    expect(transformText('hello 123!', 'uppercase')).toBe('HELLO 123!');
  });

  test('unicode characters', () => {
    expect(transformText('élève', 'uppercase')).toBe('ÉLÈVE');
  });
});

describe('transformText — lowercase', () => {
  test('simple text', () => {
    expect(transformText('HELLO', 'lowercase')).toBe('hello');
  });

  test('already lowercase', () => {
    expect(transformText('hello', 'lowercase')).toBe('hello');
  });

  test('mixed case', () => {
    expect(transformText('Hello World', 'lowercase')).toBe('hello world');
  });

  test('empty string', () => {
    expect(transformText('', 'lowercase')).toBe('');
  });

  test('unicode characters', () => {
    expect(transformText('ÉLÈVE', 'lowercase')).toBe('élève');
  });
});

describe('transformText — capitalize', () => {
  // Core contract from textTransform.ts:
  // - Apostrophe is NOT a word boundary: "don't stop" → "Don't Stop"
  // - Hyphen IS a word boundary: "hello-world" → "Hello-World"
  // - Leading whitespace preserved: "  hello" → "  Hello"
  // - Numbers not capitalized: "3d model" → "3d Model"
  // - Unicode full-range

  test('basic sentence', () => {
    expect(transformText('hello world', 'capitalize')).toBe('Hello World');
  });

  test('apostrophe is NOT a word boundary', () => {
    expect(transformText("don't stop", 'capitalize')).toBe("Don't Stop");
  });

  test('hyphen IS a word boundary', () => {
    expect(transformText('hello-world', 'capitalize')).toBe('Hello-World');
  });

  test('leading whitespace preserved', () => {
    expect(transformText('  hello world', 'capitalize')).toBe('  Hello World');
  });

  test('numbers do not break capitalization', () => {
    // "3d" — first letter of the word is 'd', which gets capitalized → "3D"
    expect(transformText('3d model', 'capitalize')).toBe('3D Model');
  });

  test('already capitalized no change', () => {
    expect(transformText('UPPERCASE', 'capitalize')).toBe('UPPERCASE');
  });

  test('empty string', () => {
    expect(transformText('', 'capitalize')).toBe('');
  });

  test('no letters — unchanged', () => {
    expect(transformText('123', 'capitalize')).toBe('123');
  });

  test('unicode — first letter capitalized', () => {
    expect(transformText('élève', 'capitalize')).toBe('Élève');
  });

  test('single word', () => {
    expect(transformText('hello', 'capitalize')).toBe('Hello');
  });

  test('multiple spaces between words', () => {
    expect(transformText('hello    world', 'capitalize')).toBe('Hello    World');
  });

  test('trailing whitespace', () => {
    expect(transformText('hello ', 'capitalize')).toBe('Hello ');
  });

  test('only whitespace', () => {
    expect(transformText('   ', 'capitalize')).toBe('   ');
  });

  test('mixed with numbers and punctuation', () => {
    // "hello! world?" — "!" is non-letter delimiter, "world?" splits
    // "world?" → "World?" — ? is trailing, first letter capitalized
    expect(transformText('hello! world?', 'capitalize')).toBe('Hello! World?');
  });

  test('apostrophe within word: single quote edge', () => {
    // "O'Brien" — apostrophe is NOT a word boundary, so "o'brien" is one word.
    // First letter 'o' is capitalized → "O'brien" (not "O'Brien").
    expect(transformText("o'brien", 'capitalize')).toBe("O'brien");
  });

  test('multiple apostrophes', () => {
    // "don't can't" → апостроф не разделитель
    expect(transformText("don't can't", 'capitalize')).toBe("Don't Can't");
  });

  test('cyrillic', () => {
    expect(transformText('привет мир', 'capitalize')).toBe('Привет Мир');
  });

  test('arabic preserved (no capitalization concept)', () => {
    // Arabic letters have no upper/lower case concept, but first \p{L}
    // gets .toUpperCase() which is a no-op for Arabic
    const result = transformText('مرحبا عالم', 'capitalize');
    expect(result).toBe('مرحبا عالم');
  });

  test('greek', () => {
    expect(transformText('αβγ δεζ', 'capitalize')).toBe('Αβγ Δεζ');
  });
});

describe('transformText — none / undefined', () => {
  test('undefined transform returns text unchanged', () => {
    expect(transformText('hello')).toBe('hello');
  });

  test('none transform returns text unchanged', () => {
    expect(transformText('hello', 'none')).toBe('hello');
  });

  test('empty string with undefined', () => {
    expect(transformText('')).toBe('');
  });
});