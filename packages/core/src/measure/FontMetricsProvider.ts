/**
 * FontMetricsProvider.ts — isomorphic font metrics provider.
 *
 * Strategy (priority):
 *   1. fontkit (Node.js) — from registered buffer
 *      - 'browser' mode: font.hhea.ascent / font.hhea.descent
 *      - 'office'  mode:  font['OS/2'].usWinAscent / font['OS/2'].usWinDescent
 *   2. Canvas TextMetrics (browser)
 *   3. Fallback (fontSize * 0.85 / 0.15)
 *
 * Uses FontRegistry for font registration.
 */

import type { FontMetrics, IFontMetricsProvider } from '../types/FontTypes.js';
import { enableOfficeTextMeasure, disableOfficeTextMeasure, registerCanvasFont } from './canvas-polyfill.js';
import { FontNotFoundError } from './FontNotFoundError.js';
import { isNodeLike } from '../utils/env.js';

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
  private cache = new Map<string, any>();   // fontkit.Font | undefined
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
   * In browser — no-op (fonts are registered via CSS @font-face).
   *
   * @param sourcePath — if provided, also registers with @napi-rs/canvas for Node.js canvas measureText
   */
  async registerFont(
    family: string,
    options: { weight?: string; style?: string },
    source: string | Buffer,
    sourcePath?: string,
  ): Promise<void> {
    // fontkit is a Node.js native addon — skip in browser
    if (!isNodeLike) {
      console.warn(`[vyaz] registerFont("${family}") недоступен в браузере, используется Canvas TextMetrics fallback`);
      return;
    }

    try {
      // Dynamic ESM import — fontkit may not be available in browser
      const fontkit = await import('fontkit');
      // @ts-ignore Buffer — not typed with moduleResolution:bundler but available at runtime
      const buffer = typeof source === 'string' ? Buffer.from(source) : source;
      // @ts-ignore fontkit CJS/ESM compatibility
      const fk = fontkit.default || fontkit;
      const font = fk.create(buffer);
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
    } catch {
      // fontkit not available (browser) — no-op
    }
    return Promise.resolve();
  }

  // ── Font object access (for per-glyph advance) ────────────────────

  /**
   * Get fontkit font object for per-character calculations.
   * Returns undefined if font is not registered or fontkit unavailable.
   */
  getFont(family: string, weight = 'normal', style = 'normal'): any | undefined {
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

    let metrics: FontMetrics;

    // Strategy 1: fontkit
    const font = this.cache.get(key);

    if (font) {
      const scale = fontSize / font.unitsPerEm;

      if (this.mode === 'office') {
        // Office mode: OS/2.usWinAscent + usWinDescent
        const os2 = font['OS/2'];
        let ascent: number;
        let descent: number;
        let sourceTable: 'OS/2' | 'hhea';

        if (os2 && os2.winAscent != null && os2.winDescent != null) {
          ascent = os2.winAscent * scale  * 1.078;
          descent = Math.abs(os2.winDescent) * scale * 1.078;
          sourceTable = 'OS/2';
        } else {
          // Fallback to hhea if OS/2 is absent
          ascent = font.ascent * scale;
          descent = Math.abs(font.descent) * scale;
          sourceTable = 'hhea';
        }

        metrics = {
          ascent,
          descent,
          capHeight: (font.capHeight ?? ascent) * scale,
          unitsPerEm: font.unitsPerEm,
          sourceTable,
        };
      } else {
        // Browser mode: hhea.ascender/descender
        metrics = {
          ascent: font.ascent * scale,
          descent: Math.abs(font.descent) * scale,
          capHeight: (font.capHeight ?? font.ascent) * scale,
          unitsPerEm: font.unitsPerEm,
          sourceTable: 'hhea',
        };
      }

      this.metricsCache.set(metricsKey, metrics);
      return metrics;
    }

    // Strategy 2: If fontkit cache is non-empty, fontkit is available but font not found → throw
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

        metrics = {
          ascent: m.fontBoundingBoxAscent || fontSize * 0.85,
          descent: m.fontBoundingBoxDescent || fontSize * 0.15,
          capHeight: m.actualBoundingBoxAscent || fontSize * 0.7,
          unitsPerEm: 1000,
          sourceTable: 'canvas',
        };
        this.metricsCache.set(metricsKey, metrics);
        return metrics;
      } catch {
        // Fall through to fallback
      }
    }

    // Font not found — throw error with clear message
    throw new FontNotFoundError(fontFamily, weight, style);
  }
}

/** Singleton */
export const fontMetricsProvider = new FontMetricsProvider();