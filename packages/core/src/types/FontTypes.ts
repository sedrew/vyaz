/**
 * FontTypes.ts — font metric type definitions.
 *
 * Isomorphic layer: works both in browser (Canvas TextMetrics) and Node.js (fontkit).
 *
 * Two modes:
 *   'browser' — uses hhea.ascender/descender (canvas fallback)
 *   'office'  — uses OS/2.usWinAscent/usWinDescent (MS Office compatible)
 */

/** Physical font metrics (in pixels for a given fontSize) */
export interface FontMetrics {
  /** Rise above baseline */
  ascent: number;
  /** Descent below baseline (positive number!) */
  descent: number;
  /** Cap height */
  capHeight: number;
  /** Original font UPM (for reference) */
  unitsPerEm: number;
  /**
   * Which font table was used for ascent/descent:
   *   'hhea'  — hhea.ascender/descender (browser mode)
   *   'OS/2'  — OS/2.usWinAscent/usWinDescent (Office mode)
   *   'canvas' — canvas.measureText (browser fallback)
   *   'fallback' — empirical formula
   */
  sourceTable?: 'hhea' | 'OS/2' | 'canvas' | 'fallback';
  /**
   * `OS/2.typoAscender / (OS/2.typoAscender − OS/2.typoDescender)` — the font's
   * own ascent-side share of its typo em-box. `undefined` when the font has no
   * OS/2 table (e.g. canvas-fallback metrics). Used in `mode: 'office'` at
   * `style.lineHeight === 1` to place the baseline (see
   * `OFFICE_BASELINE_RATIO` in PositioningEngine.ts) — Roboto's is exactly
   * 0.75 (the flat constant it was originally derived from); Arial's is
   * ≈0.776 and real PowerPoint measurably agrees with Arial's own ratio, not
   * the flat one (scripts/office-metrics/RESULTS.md).
   */
  typoAscFrac?: number;
}

/** Metrics provider — isomorphic interface */
export interface IFontMetricsProvider {
  /**
   * Set measurement mode.
   *   'browser' — hhea.ascender/descender (default)
   *   'office'  — OS/2.usWinAscent/usWinDescent
   */
  setMode(mode: 'browser' | 'office'): void;

  /**
   * Get current mode.
   */
  getMode(): 'browser' | 'office';

  /**
   * Register a binary font for use with fontkit.
   * In browser — no-op (fonts are registered via CSS @font-face).
   *
   * @param sourcePath — path to .ttf/.otf file for optional @napi-rs/canvas.registerFont()
   */
  registerFont(
    family: string,
    options: { weight?: string; style?: string },
    source: string | Buffer,
    sourcePath?: string,
  ): void;

  /**
   * Get metrics for a given family and size.
   */
  getMetrics(
    fontFamily: string,
    fontSize: number,
    weight?: string,
    style?: string,
    mode?: 'browser' | 'office',
  ): FontMetrics;
}

/** Glyph-level data for a single glyph (per-character tracking/highlighting) */
export interface GlyphData {
  char: string;            // character
  advance: number;         // advance width in px
  x: number;              // position relative to line start
}