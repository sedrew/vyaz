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
import { enableOfficeTextMeasure, disableOfficeTextMeasure } from './canvas-polyfill.js';

/** Cache key: "${family}_${weight}_${style}" */
function cacheKey(family: string, weight: string, style: string): string {
  return `${family}_${weight}_${style}`;
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
   * In browser — no-op.
   */
  async registerFont(
    family: string,
    options: { weight?: string; style?: string },
    source: string | Buffer,
  ): Promise<void> {
    try {
      // Dynamic ESM import — fontkit may not be available in browser
      const fontkit = await import('fontkit');
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

    // Strategy 2: Canvas TextMetrics (browser)
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

    console.error("Font not found")
    // Strategy 3: Fallback
    metrics = {
      ascent: fontSize * 0.85,
      descent: fontSize * 0.15,
      capHeight: fontSize * 0.7,
      unitsPerEm: 1000,
      sourceTable: 'fallback',
    };
    this.metricsCache.set(metricsKey, metrics);
    return metrics;
  }
}

/** Singleton */
export const fontMetricsProvider = new FontMetricsProvider();