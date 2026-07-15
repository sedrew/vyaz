/**
 * FontMetricsProvider.ts — isomorphic font metrics provider.
 *
 * Strategy (priority):
 *   1. FontEngine (fontkit) — from registered buffer, with smart weight fallback
 *   2. Canvas TextMetrics (browser fallback when fontkit unavailable)
 *
 * Key features:
 *   - Nested registry: family → variants (weight + style)
 *   - Smart weight fallback: if exact weight not found, picks closest
 *   - Style fallback: if exact style not found, falls back to 'normal'
 *   - Tracks pending registrations to warn about race conditions
 *   - Reusable off-screen canvas for Canvas TextMetrics fallback
 */

import type { FontMetrics, IFontMetricsProvider } from '../types/FontTypes.js';
import type { FontFace } from './FontEngine.js';
import { enableOfficeTextMeasure, disableOfficeTextMeasure } from './canvas-polyfill.js';
import { FontNotFoundError } from './FontNotFoundError.js';

// ── Reasonable default for missing glyphs ──────────────────────────────────

/**
 * Factor used when a glyph is not found in the font.
 * Multiplied by fontSize to estimate the missing glyph width.
 */
export const MISSING_GLYPH_FACTOR = 0.5;

// ── Weight normalisation ─────────────────────────────────────────────────

/**
 * Map named font weights to numeric strings.
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

/** Parse a weight string to integer. Returns NaN if unparseable. */
function weightToNumber(weight: string): number {
  const num = parseInt(weight, 10);
  return isNaN(num) ? 400 : num;
}

/** Build a variant key: "400_normal", "700_italic". */
function variantKey(weight: string, style: string): string {
  return `${normaliseWeight(weight)}_${style}`;
}

/**
 * Find the nearest registered weight to the requested weight.
 * When two weights are equally close, picks the heavier (CSS spec convention).
 *
 * @returns the registered weight string, or null if no variants registered.
 */
function nearestWeight(
  registeredWeights: number[],
  requested: number,
): number | null {
  if (registeredWeights.length === 0) return null;

  let best = registeredWeights[0];
  let bestDist = Math.abs(best - requested);

  for (let i = 1; i < registeredWeights.length; i++) {
    const w = registeredWeights[i];
    const dist = Math.abs(w - requested);
    if (
      dist < bestDist ||
      (dist === bestDist && w > best) // equal distance → heavier wins
    ) {
      best = w;
      bestDist = dist;
    }
  }

  return best;
}

/**
 * Font metrics provider — registers, resolves, and measures fonts.
 *
 * Public API (stable):
 *   - `registerFont()`
 *   - `getMetrics()`
 *   - `getFont()`
 *   - `setMode()` / `getMode()`
 *
 * Semi-stable (@beta — may change with notice):
 *   - `waitForPendingRegistrations()`
 *   - `getRegisteredFamilies()`
 *   - `getFamilyVariants()`
 *
 * Everything else is internal.
 */
export class FontMetricsProvider implements IFontMetricsProvider {
  /** @internal Nested registry: family → variantKey → FontFace */
  private registry = new Map<string, Map<string, FontFace>>();

  /** @internal Metrics cache keyed by variantKey_fontSize_mode */
  private metricsCache = new Map<string, FontMetrics>();

  /** @internal */
  private mode: 'browser' | 'office' = 'browser';

  /** @internal Set of in-flight registerFont() promises for race-condition guarding */
  private pendingRegistrations = new Set<Promise<void>>();

  /** @internal Reusable off-screen canvas for Canvas TextMetrics fallback */
  private _measureCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  /** @internal */
  private _measureCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

  /** @internal Get or create a reusable canvas context */
  private _getMeasureContext(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
    if (!this._measureCtx) {
      if (typeof OffscreenCanvas !== 'undefined') {
        this._measureCanvas = new OffscreenCanvas(1, 1);
        this._measureCtx = this._measureCanvas.getContext('2d')!;
      } else {
        this._measureCanvas = document.createElement('canvas');
        this._measureCtx = this._measureCanvas.getContext('2d')!;
      }
    }
    return this._measureCtx;
  }

  // ── Mode ──────────────────────────────────────────────────────────

  /**
   * Set measurement mode.
   * - `'browser'` — hhea.ascender/descender (default)
   * - `'office'`  — OS/2.usWinAscent/usWinDescent
   */
  setMode(mode: 'browser' | 'office'): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.metricsCache.clear();
    if (mode === 'office') {
      enableOfficeTextMeasure(this._flattenCache());
    } else {
      disableOfficeTextMeasure();
    }
  }

  /** Get current measurement mode. */
  getMode(): 'browser' | 'office' {
    return this.mode;
  }

  /**
   * @internal Flatten the nested registry for office mode.
   */
  private _flattenCache(): Map<string, FontFace> {
    const flat = new Map<string, FontFace>();
    for (const [family, variants] of this.registry) {
      for (const [vKey, font] of variants) {
        flat.set(`${family}_${vKey}`, font);
      }
    }
    return flat;
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
    const promise = this._registerFontInternal(family, options, source, sourcePath);
    this.pendingRegistrations.add(promise);
    try {
      await promise;
    } finally {
      this.pendingRegistrations.delete(promise);
    }
  }

  /** @internal Internal registration logic */
  private async _registerFontInternal(
    family: string,
    options: { weight?: string; style?: string },
    source: string | ArrayBuffer | Uint8Array,
    sourcePath?: string,
  ): Promise<void> {
    const { createFontFace } = await import('./FontEngine.js');
    const { registerCanvasFont } = await import('./canvas-polyfill.js');

    if (typeof source === 'string') {
      const { getFontBuffer } = await import('../utils/font.js');
      source = await getFontBuffer(source);
    }

    const font = await createFontFace(source);
    const w = options.weight || 'normal';
    const s = options.style || 'normal';
    const vKey = variantKey(w, s);

    if (!this.registry.has(family)) {
      this.registry.set(family, new Map());
    }
    this.registry.get(family)!.set(vKey, font);

    for (const key of this.metricsCache.keys()) {
      if (key.startsWith(family)) {
        this.metricsCache.delete(key);
      }
    }

    if (sourcePath) {
      registerCanvasFont(sourcePath, family);
    }
  }

  /**
   * Wait for all in-flight font registrations to complete.
   * Useful after a batch of registerFont() calls before layout.
   *
   * @beta — may change with notice
   */
  async waitForPendingRegistrations(): Promise<void> {
    await Promise.all(this.pendingRegistrations);
  }

  // ── Get registered family/variant info ───────────────────────────

  /**
   * List all families registered in the provider.
   *
   * @beta — may change with notice
   */
  getRegisteredFamilies(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get all variant keys registered for a given family.
   * Returns empty array if family not found.
   *
   * @beta — may change with notice
   */
  getFamilyVariants(family: string): string[] {
    const variants = this.registry.get(family);
    return variants ? Array.from(variants.keys()) : [];
  }

  // ── Font object access (with fallback) ───────────────────────────

  /**
   * Get font engine FontFace for per-character calculations.
   * Uses the same smart fallback logic as getMetrics().
   */
  getFont(
    family: string,
    weight = 'normal',
    style = 'normal',
  ): FontFace | undefined {
    const resolved = this._resolveFont(family, weight, style);
    if (!resolved) return undefined;
    return resolved.font;
  }

  /**
   * @internal Resolve a font request with fallback.
   * Returns { font, resolvedWeight, resolvedStyle } or null.
   */
  private _resolveFont(
    family: string,
    weight: string,
    style: string,
  ): { font: FontFace; resolvedWeight: string; resolvedStyle: string } | null {
    const variants = this.registry.get(family);
    if (!variants || variants.size === 0) return null;

    const normalisedW = normaliseWeight(weight);
    const normalisedS = style;

    // 1) Exact match
    let key = variantKey(normalisedW, normalisedS);
    let font = variants.get(key);
    if (font) return { font, resolvedWeight: normalisedW, resolvedStyle: normalisedS };

    // 2) Try same weight, normal style (if requested style is italic)
    if (normalisedS === 'italic') {
      key = variantKey(normalisedW, 'normal');
      font = variants.get(key);
      if (font) return { font, resolvedWeight: normalisedW, resolvedStyle: 'normal' };
    }

    // 3) Nearest weight, same style
    const sameStyleWeights: number[] = [];
    for (const vKey of variants.keys()) {
      const [_w, _s] = vKey.split('_');
      if (_s === normalisedS) {
        sameStyleWeights.push(weightToNumber(_w));
      }
    }
    const sameStyleNearest = nearestWeight(sameStyleWeights, weightToNumber(normalisedW));
    if (sameStyleNearest !== null) {
      key = variantKey(String(sameStyleNearest), normalisedS);
      font = variants.get(key);
      if (font) return { font, resolvedWeight: String(sameStyleNearest), resolvedStyle: normalisedS };
    }

    // 4) Nearest weight, normal style (fallback from italic)
    if (normalisedS === 'italic') {
      const normalWeights: number[] = [];
      for (const vKey of variants.keys()) {
        const [_w, _s] = vKey.split('_');
        if (_s === 'normal') {
          normalWeights.push(weightToNumber(_w));
        }
      }
      const normalNearest = nearestWeight(normalWeights, weightToNumber(normalisedW));
      if (normalNearest !== null) {
        key = variantKey(String(normalNearest), 'normal');
        font = variants.get(key);
        if (font) return { font, resolvedWeight: String(normalNearest), resolvedStyle: 'normal' };
      }
    }

    // 5) Any variant in family (desperate fallback)
    const firstKey = variants.keys().next().value as string | undefined;
    if (firstKey) {
      font = variants.get(firstKey);
      if (font) {
        const [_w, _s] = firstKey.split('_');
        return { font, resolvedWeight: _w, resolvedStyle: _s };
      }
    }

    return null;
  }

  // ── Metrics retrieval ─────────────────────────────────────────────

  /**
   * Get pixel-scale metrics for a given font family, size, weight, and style.
   *
   * Resolution order:
   * 1. FontEngine (fontkit) from registry — with smart weight/style fallback
   * 2. Canvas TextMetrics (browser fallback when fontkit unavailable)
   *
   * @throws FontNotFoundError when font is neither registered nor available via Canvas
   */
  getMetrics(
    fontFamily: string,
    fontSize: number,
    weight = 'normal',
    style = 'normal',
  ): FontMetrics {
    // Dev warning for pending registrations
    const _process: any = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;
    if (this.pendingRegistrations.size > 0 && _process?.env?.NODE_ENV !== 'production') {
      console.warn(
        '[vyaz] getMetrics() called while registerFont() promises are still pending. ' +
        'Wait for registerFont() to resolve before layout to avoid inaccurate metrics. ' +
        'Use fontMetricsProvider.waitForPendingRegistrations() if needed.'
      );
    }

    // Check metrics cache first
    const normalisedW = normaliseWeight(weight);
    const metricsKey = `${fontFamily}_${normalisedW}_${style}_${fontSize}_${this.mode}`;
    const cached = this.metricsCache.get(metricsKey);
    if (cached) return cached;

    // Strategy 1: FontEngine (fontkit) with smart fallback
    const resolved = this._resolveFont(fontFamily, weight, style);
    if (resolved) {
      const font = resolved.font;
      const scale = fontSize / font.unitsPerEm;

      let ascent: number;
      let descent: number;
      let sourceTable: 'hhea' | 'OS/2' | 'fallback';

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

    // Strategy 2: If any font is registered for this family, fontkit available but no match
    if (this.registry.has(fontFamily)) {
      throw new FontNotFoundError(fontFamily, weight, style);
    }

    // Strategy 3: Canvas TextMetrics (browser, fallback when fontkit unavailable)
    if (typeof document !== 'undefined') {
      try {
        const ctx = this._getMeasureContext();
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

    throw new FontNotFoundError(fontFamily, weight, style);
  }
}

/** Singleton */
export const fontMetricsProvider = new FontMetricsProvider();