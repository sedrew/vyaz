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
   */
  registerFont(
    family: string,
    options: { weight?: string; style?: string },
    source: string | Buffer,
  ): void;

  /**
   * Get metrics for a given family and size.
   */
  getMetrics(
    fontFamily: string,
    fontSize: number,
    weight?: string,
    style?: string,
  ): FontMetrics;
}

/** Glyph-level data for a single glyph (per-character tracking/highlighting) */
export interface GlyphData {
  char: string;            // character
  advance: number;         // advance width in px
  x: number;              // position relative to line start
}