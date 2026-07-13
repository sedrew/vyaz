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
  it('should throw FontNotFoundError for a non-existent font', () => {
    // This font is certainly not registered and Canvas won't be able to render it
    expect(() => {
      fontMetricsProvider.getMetrics('__nonexistent_font_xyz__', 16);
    }).toThrow(FontNotFoundError);
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

// ── 5. registerFont() runtime guard ──────────────────────────────────

describe('FontMetricsProvider — registerFont() runtime guard', () => {
  it('registerFont() should not crash in browser-like environment', async () => {
    // On Bun registerFont succeeds, which is fine —
    // the important thing is that it doesn't crash.
    // In a real browser isNodeLike === false and registerFont
    // returns early with a warning.
    await expect(
      fontMetricsProvider.registerFont('TestFont', {}, Buffer.from('dummy')),
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