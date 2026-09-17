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
   * own ascent-side share of its *typo* em-box. `undefined` when the font has
   * no OS/2 table (e.g. canvas-fallback metrics).
   */
  typoAscFrac?: number;
  /**
   * `OS/2.winAscent / (OS/2.winAscent + OS/2.winDescent)` — the font's own
   * ascent-side share of its *win* (legacy Windows/GDI) em-box. `undefined`
   * when the font has no OS/2 table.
   */
  winAscFrac?: number;
  /**
   * `OS/2.fsSelection` bit 7 — the font's own declaration that line spacing
   * should be driven by its typo metrics rather than win/hhea. `undefined`
   * when the font has no OS/2 table.
   *
   * Together with `typoAscFrac` / `winAscFrac`, this is how `mode: 'office'`
   * places the baseline at `style.lineHeight === 1` (see
   * `OFFICE_BASELINE_RATIO` in PositioningEngine.ts): for the common case
   * (`useTypoMetrics` false/undefined) real PowerPoint's baseline tracks
   * `(typoAscFrac + winAscFrac) / 2` — neither ratio alone (Roboto 0.7500 /
   * 0.7917, Arial 0.7758 / 0.8103, Times New Roman 0.7626 / 0.8047 measured
   * empirically at ~0.777 / 0.784 / 0.782 — the average lands within ~1%,
   * either ratio alone off by 2–3%). A font with `useTypoMetrics` true
   * (found via `scripts/office-metrics/gen-font-grid-diagnostic.ts`: Unifont
   * is the one oracle font with the bit set) does **not** fit that formula —
   * only one such font has been measured so far, not enough to derive its
   * own rule, so it falls back to the flat `OFFICE_BASELINE_RATIO` (still
   * open, see RESULTS.md).
   */
  useTypoMetrics?: boolean;
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