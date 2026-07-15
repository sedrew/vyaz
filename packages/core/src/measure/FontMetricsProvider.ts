/**
 * FontMetricsProvider.ts — isomorphic font metrics provider.
 *
 * Strategy (priority):
 *   1. FontEngine (fontkit) — from registered buffer
 *      - 'browser' mode: hhea.ascender / hhea.descender
 *      - 'office'  mode: OS/2.usWinAscent / OS/2.usWinDescent
 *   2. Canvas TextMetrics (browser fallback when fontkit unavailable)
 *
 * Uses FontEngine as the single entry point for all fontkit operations.
 */

import type { FontMetrics, IFontMetricsProvider } from '../types/FontTypes.js';
import type { FontFace } from './FontEngine.js';
import { enableOfficeTextMeasure, disableOfficeTextMeasure } from './canvas-polyfill.js';
import { FontNotFoundError } from './FontNotFoundError.js';

// ── Reasonable default for missing glyphs ──────────────────────────────────

/**
 * Factor used when a glyph is not found in the font.
 * Multiplied by fontSize to estimate the missing glyph width.
 * Used across all measurement code paths (ParagraphLayoutEngine, canvas-polyfill).
 */
export const MISSING_GLYPH_FACTOR = 0.5;

// ── Weight normalisation ─────────────────────────────────────────────────

/**
 * Map named font weights to numeric strings.
 * Both directions work: 'bold' → '700', 700 → '700', '700' → '700'.
 */
const WEIGHT_TO_NUM: Record<string, string> = {
  thin: '100',
  hairline: '100',
  ultralight: '200',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  demibold: '600',
  bold: '700',
  ultrabold: '800',
  extrabold: '800',
  heavy: '900',
  black: '900',
};

/** Normalise weight to a numeric string ("400", "700", etc.). */
function normaliseWeight(weight: string): string {
  const lower = weight.toLowerCase();
  const mapped = WEIGHT_TO_NUM[lower];
  if (mapped) return mapped;
  return weight; // already numeric or unrecognised — pass through
}

/** Cache key: "${family}_${weight}_${style}" with normalised weight. */
function cacheKey(family: string, weight: string, style: string): string {
  return `${family}_${normaliseWeight(weight)}_${style}`;
}

export class FontMetricsProvider implements IFontMetricsProvider {
  /** Map<string, FontFace> — font engine font face cache */
  private cache = new Map<string, FontFace>();
  private metricsCache = new Map<string, FontMetrics>();
  private mode: 'browser' | 'office' = 'browser';

  // ── Mode ──────────────────────────────────────────────────────────

  setMode(mode: 'browser' | 'office'): void {
    if (this.mode === mode) return;
    this.mode = mode;
    // Invalidate metrics cache on mode change
    this.metricsCache.clear();

    // Toggle ctx.measureText for pretext (canvas-based line breaking)
    if (mode === 'office') {
      enableOfficeTextMeasure(this.cache); // fontkit-based hmtx advance widths
    } else {
      disableOfficeTextMeasure(); // original Canvas 2D measureText
    }
  }

  getMode(): 'browser' | 'office' {
    return this.mode;
  }

  // ── FontRegistry ──────────────────────────────────────────────────

  /**
   * Register a binary font for use with fontkit.
   *
   * In both Node.js and browser the font is loaded via FontEngine.
   * In the browser the caller must provide font bytes (e.g. fetched via
   * `getFontBuffer()` from `../utils/font.js`).
   *
   * @param source      Font file bytes (ArrayBuffer / Uint8Array), or a URL string
   * @param sourcePath  Optional filesystem path (used for @napi-rs/canvas in Node.js)
   */
  async registerFont(
    family: string,
    options: { weight?: string; style?: string },
    source: string | ArrayBuffer | Uint8Array,
    sourcePath?: string,
  ): Promise<void> {
    const { createFontFace } = await import('./FontEngine.js');
    const { registerCanvasFont } = await import('./canvas-polyfill.js');

    // Convert string (URL) to buffer — works in browser via fetch
    if (typeof source === 'string') {
      const { getFontBuffer } = await import('../utils/font.js');
      source = await getFontBuffer(source);
    }

    const font = await createFontFace(source);
    const key = cacheKey(
      family,
      options.weight || 'normal',
      options.style || 'normal',
    );
    this.cache.set(key, font);
    // Invalidate metrics for this font
    this.metricsCache.delete(key);

    // Also register with @napi-rs/canvas so ctx.measureText() uses real fonts
    if (sourcePath) {
      registerCanvasFont(sourcePath, family);
    }
  }

  // ── Font object access (for per-glyph advance) ────────────────────

  /**
   * Get font engine FontFace object for per-character calculations.
   * Returns undefined if font is not registered.
   */
  getFont(family: string, weight = 'normal', style = 'normal'): FontFace | undefined {
    const key = cacheKey(family, weight, style);
    return this.cache.get(key);
  }

  // ── Metrics retrieval ─────────────────────────────────────────────

  getMetrics(
    fontFamily: string,
    fontSize: number,
    weight = 'normal',
    style = 'normal',
  ): FontMetrics {
    const key = cacheKey(fontFamily, weight, style);

    // Metrics cache (depends on fontSize, so include in key)
    const metricsKey = `${key}_${fontSize}_${this.mode}`;
    const cached = this.metricsCache.get(metricsKey);
    if (cached) return cached;

    // Strategy 1: FontEngine (fontkit)
    const font = this.cache.get(key);

    if (font) {
      // Inline computePixelMetrics to avoid circular ESM import
      const scale = fontSize / font.unitsPerEm;

      let ascent: number;
      let descent: number;
      let sourceTable: 'hhea' | 'OS/2';

      if (this.mode === 'office' && font.winAscent != null && font.winDescent != null) {
        ascent = font.winAscent * scale * 1.078;
        descent = Math.abs(font.winDescent) * scale * 1.078;
        sourceTable = 'OS/2';
      } else {
        ascent = font.ascent * scale;
        descent = Math.abs(font.descent) * scale;
        sourceTable = 'hhea';
      }

      const metrics: FontMetrics = {
        ascent,
        descent,
        capHeight: (font.capHeight ?? font.ascent) * scale,
        unitsPerEm: font.unitsPerEm,
        sourceTable,
      };

      this.metricsCache.set(metricsKey, metrics);
      return metrics;
    }

    // Strategy 2: If font cache is non-empty, fontkit is available but font not found → throw
    if (this.cache.size > 0) {
      throw new FontNotFoundError(fontFamily, weight, style);
    }

    // Strategy 3: Canvas TextMetrics (browser, fallback when fontkit unavailable)
    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        ctx.font = `${style} ${weight} ${fontSize}px ${fontFamily}`;
        const m = ctx.measureText('M');

        const metrics: FontMetrics = {
          ascent: m.fontBoundingBoxAscent || fontSize * 0.85,
          descent: m.fontBoundingBoxDescent || fontSize * 0.15,
          capHeight: m.actualBoundingBoxAscent || fontSize * 0.7,
          unitsPerEm: 1000,
          sourceTable: 'canvas',
        };
        this.metricsCache.set(metricsKey, metrics);
        return metrics;
      } catch {
        // Fall through to throw
      }
    }

    // Font not found — throw error with clear message
    throw new FontNotFoundError(fontFamily, weight, style);
  }
}

/** Singleton */
export const fontMetricsProvider = new FontMetricsProvider();