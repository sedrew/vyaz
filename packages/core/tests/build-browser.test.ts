/**
 * build-browser.test.ts — Validate that the browser bundle (dist/index.browser.js)
 * exports all values correctly.
 *
 * Bun's `bun build --target browser` has a known limitation: it does NOT inline
 * object/array constants when using `export { X } from 'module'` (ConstValueInliningBundle — todo).
 *
 * This test ensures the build output contains actual values, not undefined references.
 *
 * @see https://github.com/oven-sh/bun
 */

import { describe, test, expect } from 'bun:test';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const BROWSER_BUNDLE = resolve(PROJECT_ROOT, 'dist', 'index.browser.js');

/**
 * Expected exports from the browser bundle.
 * Functions can be verified via typeof, constants (objects/arrays) need value checks.
 */
const EXPECTED_EXPORTS = {
  // Layout Engine
  ParagraphLayoutEngine: 'function',
  paragraphLayoutEngine: 'object',
  positionLines: 'function',
  assertLineInvariants: 'function',
  linesToYAML: 'function',

  // TextFrame Layout Engine
  layoutTextFrame: 'function',

  // Autofit
  applyScale: 'function',
  findScale: 'function',

  // Compiler
  compileParagraph: 'function',
  getParagraphText: 'function',
  makeFontToken: 'function',
  collapseSegmentWhitespace: 'function',
  splitParagraphByHardBreaks: 'function',

  // Font metrics
  FontMetricsProvider: 'function',
  fontMetricsProvider: 'object',
  createFontFace: 'function',
  getGlyphAdvance: 'function',
  computePixelMetrics: 'function',
  isFontEngineAvailable: 'function',
  getFontBuffer: 'function',

  // Errors
  FontNotFoundError: 'function',

  // Types — constants (these are the ones that broke in 0.0.8)
  DEFAULT_PARAGRAPH_STYLE: 'object',
  DEFAULT_TEXT_STYLE: 'object',

  // Utils
  transformText: 'function',
  groupLinesByParagraph: 'function',
  formatListNumber: 'function',
  defaultBulletChar: 'function',
  BULLET_CHARACTERS: 'object',
};

/**
 * Exports that MUST NOT appear in the browser bundle
 * (they require node:fs or other Node.js APIs).
 */
const FORBIDDEN_EXPORTS = ['SystemFontRegistry', 'systemFontRegistry'];

describe('build-browser', () => {
  test('dist/index.browser.js exists after build', () => {
    if (!existsSync(BROWSER_BUNDLE)) {
      // Rebuild
      execSync('bun run build', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
      });
    }
    expect(existsSync(BROWSER_BUNDLE)).toBe(true);
  });

  test('all expected exports are present and have correct types', async () => {
    // Dynamic import of the built bundle
    const mod = await import(BROWSER_BUNDLE);

    for (const [name, expectedType] of Object.entries(EXPECTED_EXPORTS)) {
      expect(mod).toHaveProperty(name);

      if (expectedType === 'function') {
        expect(typeof mod[name]).toBe('function');
      } else if (expectedType === 'object') {
        expect(typeof mod[name]).toBe('object');
        expect(mod[name]).not.toBeNull();
      }
    }
  });

  test('DEFAULT_PARAGRAPH_STYLE has expected fields', async () => {
    const mod = await import(BROWSER_BUNDLE);
    const dps = mod.DEFAULT_PARAGRAPH_STYLE;

    expect(dps).toBeDefined();
    expect(dps.alignment).toBe('left');
    expect(dps.lineHeight).toBe(1.15);
    expect(dps.spaceBefore).toBe(0);
    expect(dps.spaceAfter).toBe(0);
    expect(dps.whiteSpace).toBe('normal');
  });

  test('DEFAULT_TEXT_STYLE has expected fields', async () => {
    const mod = await import(BROWSER_BUNDLE);
    const dts = mod.DEFAULT_TEXT_STYLE;

    expect(dts).toBeDefined();
    expect(dts.fontFamily).toBe('Arial');
    expect(dts.fontSize).toBe(12);
    expect(dts.fontWeight).toBe('normal');
    expect(dts.fontStyle).toBe('normal');
    expect(dts.color).toBe('#000000');
  });

  test('BULLET_CHARACTERS has expected bullet chars', async () => {
    const mod = await import(BROWSER_BUNDLE);
    const bc = mod.BULLET_CHARACTERS;

    expect(bc).toBeDefined();
    expect(bc[0]).toBe('\u2022'); // • BULLET
    expect(bc[1]).toBe('\u25CB'); // ○ WHITE CIRCLE
    expect(bc[2]).toBe('\u25AA'); // ▪ BLACK SMALL SQUARE
  });

  test('ParagraphLayoutEngine can be instantiated and used', async () => {
    const mod = await import(BROWSER_BUNDLE);
    const engine = new mod.ParagraphLayoutEngine();
    expect(engine).toBeInstanceOf(mod.ParagraphLayoutEngine);
  });

  test('forbidden exports (node:fs-dependent) are not present', async () => {
    const mod = await import(BROWSER_BUNDLE);
    for (const name of FORBIDDEN_EXPORTS) {
      expect(mod).not.toHaveProperty(name);
    }
  });

  test('bundle is valid JavaScript (no syntax errors)', () => {
    const code = readFileSync(BROWSER_BUNDLE, 'utf-8');
    // Just check it has actual content and starts with expected export pattern
    expect(code.length).toBeGreaterThan(100);
    // Should contain the constants (inlined)
    expect(code).toMatch(/left|Arial|2022|25CB|25AA/);
  });
});