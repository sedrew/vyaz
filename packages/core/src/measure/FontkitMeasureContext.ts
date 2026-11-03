/**
 * FontkitMeasureContext.ts — the measurement seam for vendored pretext.
 *
 * `src/vendor/pretext/measurement.js` takes its "canvas" context from
 * `createMeasureContextProxy()` in this module instead of making a canvas 2d
 * context. The proxy forwards to the context installed at the time of each
 * call. pretext uses a small slice of the canvas API — see
 * {@link MeasureContextLike}. It draws nothing, and the context has no
 * `letterSpacing` attribute, so letter spacing stays pretext's own arithmetic.
 *
 * Backends:
 *
 *   - fontkit (the default; installed by `ParagraphLayoutEngine` at module load
 *     via `setMeasureContext(createFontkitMeasureContext(...))`) — measures from
 *     the font tables. Same per-code-point advances and missing-glyph policy as
 *     glyph positioning, so line breaking and positioning agree.
 *   - canvas (`createCanvasMeasureContext`) — pretext's original behaviour, kept
 *     only as a browser-only escape hatch via `setMeasureContext(null)`. It
 *     needs a real `OffscreenCanvas`/`document`; in Node/Bun it now throws
 *     rather than pulling a canvas polyfill.
 *
 * Shaping (kerning, ligatures via `font.layout()`) is a separate, later change.
 * Landing it at the same time would make the snapshot delta unreadable.
 */

import type { FontFace } from './FontEngine.js';
import { MISSING_GLYPH_FACTOR, opticalSizeInstance } from './FontEngine.js';
import { FontNotFoundError } from './FontNotFoundError.js';

// ── Contract ─────────────────────────────────────────────────────────────

/**
 * The slice of `CanvasRenderingContext2D` that pretext actually consumes.
 *
 * `font` must read back what was written (pretext checks that a context took a
 * font string), `fontKerning = 'none'` must turn kerning off (pretext compares
 * the two to find a font's kerning with the space and between kana), and
 * U+2028 must measure as the space glyph (Blink draws it with that glyph, and
 * pretext probes space kerning with it). The ink box is only read for kana and
 * CJK punctuation probes.
 */
export interface MeasureContextLike {
  font: string;
  fontKerning?: string;
  measureText(text: string): MeasuredText;
}

/** What {@link MeasureContextLike.measureText} returns. */
export interface MeasuredText {
  width: number;
  actualBoundingBoxLeft?: number;
  actualBoundingBoxRight?: number;
}

/**
 * Font lookup, structurally satisfied by `FontMetricsProvider`.
 * Kept minimal so this module does not depend on the provider.
 */
export interface FontResolver {
  getFont(family: string, weight?: string, style?: string): FontFace | undefined;
}

// ── Measure profile ─────────────────────────────────────────────────────

/**
 * How widths are computed from the font tables.
 *
 *   - `'advance'` (default) — Σ per-code-point `advanceWidth`. Fast, and
 *     shaping-invariant, but ignores kerning and ligatures, so it drifts from
 *     what a browser paints (up to a few px per word on a kerned Latin font).
 *   - `'shape'` — fontkit `layout()` advance: GPOS kerning + GSUB (`liga`,
 *     `clig`, `calt`, `ccmp`), i.e. browser-default behaviour. Use for the SVG
 *     `browser` preset when on-screen width has to match the layout.
 */
export interface MeasureProfile {
  engine: 'advance' | 'shape';
  /** `'shape'` only — OpenType feature overrides, e.g. `{ liga: false }`. */
  features?: Record<string, boolean>;
  /**
   * `'shape'` only — kerning applies just to text at `fontSize >= kernMinSize`
   * (smaller text is shaped with `kern: false`). Mirrors DrawingML's
   * `<a:rPr kern="1200">` "kerning for fonts N points and above", whose Office
   * default is 12pt.
   */
  kernMinSize?: number;
  /**
   * `'shape'` only — kern only fonts that carry a classic `kern` table. PowerPoint kerns
   * Times New Roman / Arial / Calibri (kern table) but never Roboto / Inter (GPOS only):
   * measured on Roboto at 11, 16, 20, 24 and 72pt, no pair ever kerns.
   */
  kernRequiresTable?: boolean;
  /**
   * Round every glyph advance to a multiple of this many px (PowerPoint lays glyphs
   * out on a 1/8 pt grid: all 266 glyphs of a Roboto / Times New Roman alphabet at
   * 20 and 11pt were exact multiples of 0.125pt, equal to the font advance rounded
   * to nearest). Kerning is added on top, unrounded. Ignored when unset or 0.
   */
  advanceQuantum?: number;
  /**
   * Instance fonts with a free `opsz` axis at the used size, like CSS
   * `font-optical-sizing: auto` (see `opticalSizeInstance`). On unless `false`;
   * `mode: 'office'` turns it off (PowerPoint was never measured doing it).
   */
  opticalSizing?: boolean;
}

let profile: MeasureProfile = { engine: 'advance' };

/** The fields of `p` that change what `measurePx` returns for a given font, as a string. */
function widthKey(p: MeasureProfile): string {
  // `advance` reads none of the shaping fields, so all such profiles share one key.
  if (p.engine !== 'shape') return `a${p.advanceQuantum || 0}`;
  return `s${p.advanceQuantum || 0}|${p.kernMinSize ?? ''}|${p.kernRequiresTable ? 'T' : ''}|${p.features ? JSON.stringify(p.features) : ''}`;
}

let profileKey = profileKeyOf(profile);
function profileKeyOf(p: MeasureProfile): string {
  // optical sizing picks the font instance, which pretext only knows by its `font` string
  return `${widthKey(p)}|${p.opticalSizing === false ? 'N' : ''}\u0001`;
}

/** Install the measurement profile used by every fontkit-backed measure path. */
export function setMeasureProfile(next: MeasureProfile): void {
  profile = next;
  profileKey = profileKeyOf(next);
}

/**
 * The active profile as a cache-key prefix: two profiles share a key exactly
 * when they measure every text identically. Caches of measured widths (the
 * prepared-line cache, vendored pretext's per-font segment cache) key on it,
 * so switching profile neither cross-feeds widths nor throws the caches away.
 */
export function getMeasureProfileKey(): string {
  return profileKey;
}

/** The active measurement profile. */
export function getMeasureProfile(): MeasureProfile {
  return profile;
}

/** `font` as the active profile measures it at `fontSize` (optical-size instance or itself). */
export function sizedFont(font: FontFace, fontSize: number): FontFace {
  return profile.opticalSizing === false ? font : opticalSizeInstance(font, fontSize);
}

// ── Active context ───────────────────────────────────────────────────────

let active: MeasureContextLike | null = null;
let canvasFallback: MeasureContextLike | null = null;

/**
 * Install the measure context pretext will use.
 *
 * Pass `null` to fall back to canvas. Takes effect on the next measurement —
 * unlike upstream, nothing is latched, so this is safe to flip in tests.
 */
export function setMeasureContext(ctx: MeasureContextLike | null): void {
  active = ctx;
}

/** The currently installed context, or `null` when on the canvas fallback. */
export function getInstalledMeasureContext(): MeasureContextLike | null {
  return active;
}

/**
 * Called by vendored pretext on every measurement.
 *
 * Resolution is lazy and per-call rather than latched at module init, so there
 * is no installation order to get wrong and no window in which a worker thread
 * measures through the wrong backend.
 */
export function getMeasureContext(): MeasureContextLike {
  if (active !== null) return active;
  if (canvasFallback === null) canvasFallback = createCanvasMeasureContext();
  return canvasFallback;
}

/**
 * The context vendored pretext measures through: every member forwards to
 * {@link getMeasureContext} at the time of the call. pretext keeps the object
 * it makes for good, so a later `setMeasureContext()` still takes effect.
 *
 * `fontKerning` and `textRendering` are kept per proxy (pretext makes a second
 * context for whole-run probes) and applied around each measurement.
 */
export function createMeasureContextProxy(): MeasureContextLike & { lang?: string; textRendering?: string } {
  let fontKerning = 'auto';
  return {
    lang: undefined,
    textRendering: 'auto',
    get font(): string {
      return getMeasureContext().font;
    },
    set font(spec: string) {
      getMeasureContext().font = spec;
    },
    get fontKerning(): string {
      return fontKerning;
    },
    set fontKerning(value: string) {
      fontKerning = value;
    },
    measureText(text: string): MeasuredText {
      const ctx = getMeasureContext();
      if (fontKerning === 'auto') return ctx.measureText(text);
      const before = ctx.fontKerning;
      ctx.fontKerning = fontKerning;
      try {
        return ctx.measureText(text);
      } finally {
        ctx.fontKerning = before;
      }
    },
  };
}

// ── Canvas backend (upstream behaviour) ──────────────────────────────────

/**
 * Reproduces pretext's original `getMeasureContext()`. Browser-only: needs a
 * real `OffscreenCanvas` or `document`. Only reached after an explicit
 * `setMeasureContext(null)`; the fontkit backend is the default everywhere.
 */
export function createCanvasMeasureContext(): MeasureContextLike {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(1, 1).getContext('2d') as unknown as MeasureContextLike;
  }
  if (typeof document !== 'undefined') {
    return document.createElement('canvas').getContext('2d') as unknown as MeasureContextLike;
  }
  throw new Error(
    'setMeasureContext(null) needs a browser canvas. In Node/Bun the fontkit ' +
    'backend is the only measurement path — do not clear it.',
  );
}

// ── CSS font shorthand ───────────────────────────────────────────────────

/** Parsed form of the `font` strings pretext is handed. */
interface ParsedFont {
  families: string[];
  weight: string;
  style: string;
  size: number;
}

const FONT_STYLES = new Set(['italic', 'oblique']);

/**
 * Parse the shorthand `ParagraphCompiler.makeFontToken` produces
 * (`"italic 700 18px Segoe UI"`), and the plainer forms pretext's own API
 * documents (`"16px Inter"`).
 *
 * Everything after the `<size>px` token is the family list — that is where the
 * shorthand puts it, and unlike the size and weight it may contain spaces.
 */
function parseFont(spec: string): ParsedFont | null {
  const px = /(\d+(?:\.\d+)?)px\s+(.+)$/.exec(spec);
  if (!px) return null;

  const size = Number.parseFloat(px[1]);
  const families = px[2]
    .split(',')
    .map((name) => name.trim().replace(/^["']|["']$/g, ''))
    .filter((name) => name.length > 0);
  if (families.length === 0) return null;

  let weight = 'normal';
  let style = 'normal';
  for (const token of spec.slice(0, px.index).trim().split(/\s+/)) {
    const lower = token.toLowerCase();
    if (FONT_STYLES.has(lower)) style = 'italic';
    else if (lower === 'bold' || /^\d{3}$/.test(lower)) weight = lower;
  }

  return { families, weight, style, size };
}

// ── fontkit backend ──────────────────────────────────────────────────────

/** Resolved font plus the units-per-em scale for the requested size. */
interface MeasureState {
  raw: unknown;
  scale: number;
  size: number;
  /** The profile's optical sizing when this state was resolved. */
  opticalSizing: boolean;
}

const kernTableCache = new WeakMap<object, boolean>();
/** Whether the font carries a classic OpenType/TrueType `kern` table. */
function hasKernTable(raw: any): boolean {
  let v = kernTableCache.get(raw);
  if (v === undefined) {
    v = !!raw?.directory?.tables?.kern;
    kernTableCache.set(raw, v);
  }
  return v;
}

// Shaped widths, font → (profile, size) → text → px. Line breaking and
// positioning measure the same words over and over — within a document and
// across `layoutTextFrame()` calls — and each miss is a full fontkit `layout()`.
const SHAPE_CACHE_MAX_ENTRIES = 200_000;
/** Longer strings are rarely measured twice and would make for heavy keys. */
const SHAPE_CACHE_MAX_TEXT = 256;
let shapeCache = new WeakMap<object, Map<string, Map<string, number>>>();
let shapeCacheSize = 0;
const widthKeys = new WeakMap<MeasureProfile, string>();
// The last (font, scale, size, profile) looked up: consecutive calls mostly repeat it.
let lastRaw: unknown = null;
let lastScale = 0;
let lastSize = 0;
let lastProf: MeasureProfile | null = null;
let lastWidths: Map<string, number> | null = null;

function shapeWidths(raw: object, scale: number, fontSize: number, prof: MeasureProfile): Map<string, number> {
  if (lastWidths !== null && raw === lastRaw && scale === lastScale && fontSize === lastSize && prof === lastProf) {
    return lastWidths;
  }
  let byVariant = shapeCache.get(raw);
  if (byVariant === undefined) {
    byVariant = new Map();
    shapeCache.set(raw, byVariant);
  }
  let pk = widthKeys.get(prof);
  if (pk === undefined) {
    pk = widthKey(prof);
    widthKeys.set(prof, pk);
  }
  const variant = `${pk}|${fontSize}|${scale}`;
  let widths = byVariant.get(variant);
  if (widths === undefined) {
    widths = new Map();
    byVariant.set(variant, widths);
  }
  lastRaw = raw;
  lastScale = scale;
  lastSize = fontSize;
  lastProf = prof;
  lastWidths = widths;
  return widths;
}

/** Drop every cached shaped width (they are also dropped wholesale past a size bound). */
export function clearMeasureCache(): void {
  shapeCache = new WeakMap();
  shapeCacheSize = 0;
  lastRaw = lastProf = lastWidths = null;
}

/**
 * Pixel width of `text` under `profile`. Shared by the pretext measure context
 * and `ParagraphLayoutEngine`'s fragment measurement so line breaking and
 * positioning never disagree.
 *
 *   - `advance` — Σ per-code-point `advanceWidth`, surrogate-aware, with the
 *     `MISSING_GLYPH_FACTOR · fontSize` estimate for absent glyphs.
 *   - `shape`   — fontkit `layout()` advance (kerning + ligatures). Missing
 *     glyphs there fall back to the same per-code-point estimate for the
 *     stretch that produced no advance, so the two profiles agree on
 *     un-shapeable text.
 */
export function measurePx(
  raw: any,
  scale: number,
  fontSize: number,
  text: string,
  prof: MeasureProfile = profile,
): number {
  if (!text) return 0;
  // The advance sum is a table lookup per code point; only `layout()` is worth a cache.
  if (prof.engine !== 'shape' || text.length > SHAPE_CACHE_MAX_TEXT) {
    return computePx(raw, scale, fontSize, text, prof);
  }
  const widths = shapeWidths(raw, scale, fontSize, prof);
  let px = widths.get(text);
  if (px === undefined) {
    px = computePx(raw, scale, fontSize, text, prof);
    if (++shapeCacheSize > SHAPE_CACHE_MAX_ENTRIES) {
      clearMeasureCache();
      shapeWidths(raw, scale, fontSize, prof).set(text, px);
      shapeCacheSize = 1;
    } else {
      widths.set(text, px);
    }
  }
  return px;
}

function computePx(raw: any, scale: number, fontSize: number, text: string, prof: MeasureProfile): number {
  const q = prof.advanceQuantum ? prof.advanceQuantum : 0;
  const snap = (px: number) => (q ? Math.round(px / q) * q : px);

  if (prof.engine === 'shape') {
    try {
      const noKern =
        (prof.kernMinSize !== undefined && fontSize < prof.kernMinSize) ||
        (prof.kernRequiresTable === true && !hasKernTable(raw));
      const features = noKern ? { ...prof.features, kern: false } : prof.features;
      const run = raw.layout(text, features);
      const positions = run.positions ?? [];
      let px = 0;
      for (let i = 0; i < run.glyphs.length; i++) {
        // A missing code point (.notdef, glyph 0) gets the same estimate as in
        // the per-code-point sum, not the .notdef box advance — or a text with
        // one measures differently whole and in pieces (pretext reads that
        // difference as kerning with the space).
        if (run.glyphs[i].id === 0) {
          px += fontSize * MISSING_GLYPH_FACTOR;
          continue;
        }
        const base = run.glyphs[i].advanceWidth ?? 0;
        const shaped = positions[i]?.xAdvance ?? base;
        // grid-snapped base advance + unrounded kerning (xAdvance − advanceWidth)
        px += q ? snap(base * scale) + (shaped - base) * scale : shaped * scale;
      }
      // layout() maps missing code points to .notdef (glyph id 0). If every
      // shaped glyph is .notdef the run told us nothing — fall through to the
      // per-code-point estimate rather than trusting a box-width advance.
      if (run.glyphs.length > 0 && run.glyphs.some((g: any) => g.id !== 0)) {
        return px;
      }
    } catch {
      // Complex-script shaper threw — fall back to the advance sum.
    }
  }

  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i)!;
    // `glyphForCodePoint` never returns null — an unmapped code point yields
    // `.notdef`, whose box advance is not what a browser fallback paints.
    const advance = raw.hasGlyphForCodePoint(cp) ? raw.glyphForCodePoint(cp).advanceWidth : null;
    width += advance != null ? snap(advance * scale) : fontSize * MISSING_GLYPH_FACTOR;
    if (cp > 0xffff) i++;
  }
  return width;
}

/** CSS generic family keywords — pretext probes `16px serif` / `16px monospace` itself. */
const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui']);

/** `p` with kerning off (`fontKerning = 'none'`), one object per profile so width caches hit. */
const unkernedProfiles = new WeakMap<MeasureProfile, MeasureProfile>();
function unkerned(p: MeasureProfile): MeasureProfile {
  // `advance` never kerns
  if (p.engine !== 'shape') return p;
  let q = unkernedProfiles.get(p);
  if (q === undefined) {
    q = { ...p, features: { ...p.features, kern: false } };
    unkernedProfiles.set(p, q);
  }
  return q;
}

/**
 * Build a measure context backed by the font tables.
 *
 * @param resolver - font lookup, normally the shared `fontMetricsProvider`
 */
export function createFontkitMeasureContext(resolver: FontResolver): MeasureContextLike {
  // Keyed by the raw `font` string: pretext re-assigns the same handful of
  // shorthands thousands of times per document.
  const states = new Map<string, MeasureState | null>();
  let spec = '';
  let state: MeasureState | null = null;

  function resolve(nextSpec: string): MeasureState | null {
    const key = (profile.opticalSizing === false ? '0' : '1') + nextSpec;
    const cached = states.get(key);
    if (cached !== undefined) return cached;

    const parsed = parseFont(nextSpec);
    if (parsed === null) return null;

    let font: FontFace | undefined;
    for (const family of parsed.families) {
      font = resolver.getFont(family, parsed.weight, parsed.style);
      if (font !== undefined) break;
    }
    if (font === undefined) {
      // pretext's own probes (`1px serif`, `16px monospace`) name only generic
      // families; vyaz never lays text out in one, so they measure nothing.
      if (parsed.families.every((f) => GENERIC_FAMILIES.has(f.toLowerCase()))) {
        states.set(key, null);
        return null;
      }
      throw new FontNotFoundError(parsed.families[0], parsed.weight, parsed.style);
    }

    font = sizedFont(font, parsed.size);
    const next: MeasureState = {
      raw: font._raw,
      scale: parsed.size / font.unitsPerEm,
      size: parsed.size,
      opticalSizing: profile.opticalSizing !== false,
    };
    states.set(key, next);
    return next;
  }

  return {
    fontKerning: 'auto',

    get font(): string {
      return spec;
    },
    set font(nextSpec: string) {
      if (nextSpec === spec) return;
      spec = nextSpec;
      state = resolve(nextSpec);
    },

    measureText(text: string): MeasuredText {
      if (state === null || text.length === 0) return { width: 0, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 0 };
      // the profile may have switched optical sizing since this font was resolved
      if (state.opticalSizing !== (profile.opticalSizing !== false)) state = resolve(spec);
      if (state === null) return { width: 0, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 0 };
      // Blink draws U+2028 with the space glyph; pretext probes kerning with the space through it
      const measured = text.includes(' ') ? text.replaceAll(' ', ' ') : text;
      const prof = this.fontKerning === 'none' ? unkerned(profile) : profile;
      const width = measurePx(state.raw, state.scale, state.size, measured, prof);
      // No ink box from the advance tables: report the advance box.
      return { width, actualBoundingBoxLeft: 0, actualBoundingBoxRight: width };
    },
  };
}
