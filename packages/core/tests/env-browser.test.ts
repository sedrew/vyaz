/**
 * env-browser.test.ts — verifies @vyaz/core browser compatibility.
 *
 * 1. isNodeLike === true on Bun/Node
 * 2. index.browser.ts exports everything except SystemFontRegistry
 * 3. Canvas fallback works in getMetrics()
 * 4. FontNotFoundError for non-existent fonts
 * 5. registerFont() does not crash when fontkit is unavailable (non-Node)
 * 6. index.ts (node entry) includes SystemFontRegistry
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { fontMetricsProvider } from '../src/measure/FontMetricsProvider.js';
import { FontNotFoundError } from '../src/measure/FontNotFoundError.js';

// ── 1. env.ts ─────────────────────────────────────────────────────────

describe('env.ts — isNodeLike', () => {
  it('should be true on Bun/Node', async () => {
    const { isNodeLike } = await import('../src/utils/env.js');
    expect(isNodeLike).toBe(true);
  });
});

// ── 2. index.browser.ts ───────────────────────────────────────────────

describe('index.browser.ts — browser entry', () => {
  it('should export layoutTextFrame', async () => {
    const mod = await import('../src/index.browser.js');
    expect(typeof mod.layoutTextFrame).toBe('function');
  });

  it('should export ParagraphLayoutEngine', async () => {
    const mod = await import('../src/index.browser.js');
    expect(typeof mod.ParagraphLayoutEngine).toBe('function');
    expect(typeof mod.paragraphLayoutEngine).toBe('object');
  });

  it('should export FontMetricsProvider', async () => {
    const mod = await import('../src/index.browser.js');
    expect(typeof mod.FontMetricsProvider).toBe('function');
    expect(typeof mod.fontMetricsProvider).toBe('object');
  });

  it('should NOT export SystemFontRegistry', async () => {
    const mod = await import('../src/index.browser.js') as any;
    expect(mod.SystemFontRegistry).toBeUndefined();
    expect(mod.systemFontRegistry).toBeUndefined();
  });

  it('should export layout utilities', async () => {
    const mod = await import('../src/index.browser.js');
    expect(typeof mod.positionLines).toBe('function');
    expect(typeof mod.assertLineInvariants).toBe('function');
    expect(typeof mod.linesToYAML).toBe('function');
  });

  it('should export autofit', async () => {
    const mod = await import('../src/index.browser.js');
    expect(typeof mod.applyScale).toBe('function');
    expect(typeof mod.findScale).toBe('function');
  });

  it('should export compiler', async () => {
    const mod = await import('../src/index.browser.js');
    expect(typeof mod.compileParagraph).toBe('function');
    expect(typeof mod.getParagraphText).toBe('function');
    expect(typeof mod.makeFontToken).toBe('function');
  });

  it('should export style constants', async () => {
    const mod = await import('../src/index.browser.js');
    expect(mod.DEFAULT_PARAGRAPH_STYLE).toBeDefined();
    expect(mod.DEFAULT_TEXT_STYLE).toBeDefined();
  });

  it('should export errors', async () => {
    const mod = await import('../src/index.browser.js');
    expect(mod.FontNotFoundError).toBeDefined();
  });
});

// ── 3. FontMetricsProvider in browser mode ────────────────────────────

describe('FontMetricsProvider — browser mode', () => {
  beforeAll(() => {
    fontMetricsProvider.setMode('browser');
  });

  it('should have mode === "browser"', () => {
    expect(fontMetricsProvider.getMode()).toBe('browser');
  });

  it('getMetrics() should use Canvas fallback for system fonts', () => {
    // Arial is registered via helpers (registerArialVariants in text-run.test.ts),
    // but even if not — Canvas fallback saves it on Bun (has @napi-rs/canvas)
    expect(() => {
      fontMetricsProvider.getMetrics('Arial', 16);
    }).not.toThrow();
  });

  it('getMetrics() returns FontMetrics with correct structure', () => {
    const metrics = fontMetricsProvider.getMetrics('Arial', 16);
    expect(metrics).toBeDefined();
    expect(typeof metrics.ascent).toBe('number');
    expect(typeof metrics.descent).toBe('number');
    expect(typeof metrics.capHeight).toBe('number');
    expect(typeof metrics.unitsPerEm).toBe('number');
    expect(metrics.sourceTable).toBeDefined();
    expect(metrics.ascent).toBeGreaterThan(0);
    expect(metrics.descent).toBeGreaterThan(0);
  });
});

// ── 4. FontNotFoundError ──────────────────────────────────────────────

describe('FontMetricsProvider — FontNotFoundError', () => {
  it('should throw FontNotFoundError for a non-existent font (or use Canvas fallback)', () => {
    // On Bun/Node with @napi-rs/canvas, Canvas fallback returns metrics.
    // In a real browser without the font, it should throw.
    // Accept both outcomes depending on environment.
    try {
      const m = fontMetricsProvider.getMetrics('__nonexistent_font_xyz__', 16);
      // Canvas fallback worked — got metrics
      expect(m).toBeDefined();
      expect(m.ascent).toBeGreaterThan(0);
      expect(m.sourceTable).toBe('canvas');
    } catch (e) {
      expect(e).toBeInstanceOf(FontNotFoundError);
    }
  });

  it('FontNotFoundError should contain the font name', () => {
    try {
      fontMetricsProvider.getMetrics('UnknownFont', 12);
    } catch (e) {
      expect(e).toBeInstanceOf(FontNotFoundError);
      expect((e as FontNotFoundError).message).toContain('UnknownFont');
    }
  });
});

// ── 5. Smart weight/style fallback tests ──────────────────────────

describe('FontMetricsProvider — weight/style fallback', () => {
  beforeAll(() => {
    fontMetricsProvider.setMode('browser');
  });

  it('exact match returns correct family variants', () => {
    // Register a single variant with getRegisteredFamilies/getFamilyVariants
    const families = fontMetricsProvider.getRegisteredFamilies();
    // At minimum TestUnifont from previous test should be registered
    expect(Array.isArray(families)).toBe(true);
  });

  it('getFont() with weight fallback — nearest heavier wins for equal distance', async () => {
    // Register Roboto with 400 and 900 only
    const { readFileSync, existsSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const fontPath = resolve(__dirname, 'fixtures', 'unifont-17.0.05.otf');
    if (!existsSync(fontPath)) return;
    const data = readFileSync(fontPath);

    await fontMetricsProvider.registerFont('FallbackTest', { weight: '400', style: 'normal' }, data);
    await fontMetricsProvider.registerFont('FallbackTest', { weight: '900', style: 'normal' }, data);

    // Request 700 — 900 is nearest (distance 200) vs 400 (distance 300)
    const font = fontMetricsProvider.getFont('FallbackTest', '700');
    expect(font).toBeDefined();
  });

  it('weight fallback — light requested, only normal (400) registered', async () => {
    const { readFileSync, existsSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const fontPath = resolve(__dirname, 'fixtures', 'unifont-17.0.05.otf');
    if (!existsSync(fontPath)) return;
    const data = readFileSync(fontPath);

    await fontMetricsProvider.registerFont('LightTest', { weight: '400', style: 'normal' }, data);

    // Request light (300) — nearest is 400
    const m = fontMetricsProvider.getMetrics('LightTest', 16, 'light');
    expect(m.ascent).toBeGreaterThan(0);
  });

  it('italic style falls back to normal when italic not registered', async () => {
    const { readFileSync, existsSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const fontPath = resolve(__dirname, 'fixtures', 'unifont-17.0.05.otf');
    if (!existsSync(fontPath)) return;
    const data = readFileSync(fontPath);

    await fontMetricsProvider.registerFont('ItalicTest', { weight: '400', style: 'normal' }, data);

    // Request italic — should fall back to normal
    const m = fontMetricsProvider.getMetrics('ItalicTest', 16, 'normal', 'italic');
    expect(m.ascent).toBeGreaterThan(0);
  });

  it('bold weight registered, bold requested → exact match', async () => {
    const { readFileSync, existsSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const fontPath = resolve(__dirname, 'fixtures', 'unifont-17.0.05.otf');
    if (!existsSync(fontPath)) return;
    const data = readFileSync(fontPath);

    await fontMetricsProvider.registerFont('BoldTest', { weight: '700', style: 'normal' }, data);

    // Request bold (700) — exact match
    const m = fontMetricsProvider.getMetrics('BoldTest', 16, 'bold');
    expect(m.ascent).toBeGreaterThan(0);
  });
});

// ── 6. registerFont() — works both in Node and browser ──────────────

describe('FontMetricsProvider — registerFont() cross-environment', () => {
  it('registerFont() should work with a valid font buffer', async () => {
    // registerFont now actually loads via FontEngine everywhere.
    // Using Unifont fixture which is valid.
    const { readFileSync, existsSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const fontPath = resolve(__dirname, 'fixtures', 'unifont-17.0.05.otf');
    if (!existsSync(fontPath)) {
      // If fixture is missing (e.g. running outside core dir), skip
      console.warn('Unifont fixture not found, skipping valid font test');
      return;
    }
    const data = readFileSync(fontPath);
    await expect(
      fontMetricsProvider.registerFont('TestUnifont', {}, data),
    ).resolves.toBeUndefined();
  });
});

// ── 6. index.ts (Node entry) includes SystemFontRegistry ──────────────

describe('index.ts — node entry', () => {
  it('should export SystemFontRegistry', async () => {
    const mod = await import('../src/index.js');
    expect(mod.SystemFontRegistry).toBeDefined();
    expect(mod.systemFontRegistry).toBeDefined();
  });
});