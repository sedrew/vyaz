/**
 * FontkitMeasureContext.ts — the measurement seam for vendored pretext.
 *
 * `src/vendor/pretext/measurement.js` calls `getMeasureContext()` from this
 * module instead of reaching for a canvas 2d context. That is the whole
 * integration: pretext only ever uses two members of the object it gets back —
 * `ctx.font = "..."` and `ctx.measureText(s).width` — so the contract is tiny.
 * It draws nothing, and it reads no other property (letter-spacing is pretext's
 * own arithmetic, not the canvas attribute).
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
import { MISSING_GLYPH_FACTOR } from './FontEngine.js';
import { FontNotFoundError } from './FontNotFoundError.js';

// ── Contract ─────────────────────────────────────────────────────────────

/**
 * The slice of `CanvasRenderingContext2D` that pretext actually consumes.
 */
export interface MeasureContextLike {
  font: string;
  measureText(text: string): { width: number };
}

/**
 * Font lookup, structurally satisfied by `FontMetricsProvider`.
 * Kept minimal so this module does not depend on the provider.
 */
export interface FontResolver {
  getFont(family: string, weight?: string, style?: string): FontFace | undefined;
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
}

/**
 * Build a measure context backed by the font tables.
 *
 * @param resolver - font lookup, normally the shared `fontMetricsProvider`
 */
export function createFontkitMeasureContext(resolver: FontResolver): MeasureContextLike {
  // Keyed by the raw `font` string: pretext re-assigns the same handful of
  // shorthands thousands of times per document.
  const states = new Map<string, MeasureState>();
  let spec = '';
  let state: MeasureState | null = null;

  function resolve(nextSpec: string): MeasureState | null {
    const cached = states.get(nextSpec);
    if (cached !== undefined) return cached;

    const parsed = parseFont(nextSpec);
    if (parsed === null) return null;

    let font: FontFace | undefined;
    for (const family of parsed.families) {
      font = resolver.getFont(family, parsed.weight, parsed.style);
      if (font !== undefined) break;
    }
    if (font === undefined) {
      throw new FontNotFoundError(parsed.families[0], parsed.weight, parsed.style);
    }

    const next: MeasureState = {
      raw: font._raw,
      scale: parsed.size / font.unitsPerEm,
      size: parsed.size,
    };
    states.set(nextSpec, next);
    return next;
  }

  return {
    get font(): string {
      return spec;
    },
    set font(nextSpec: string) {
      if (nextSpec === spec) return;
      spec = nextSpec;
      state = resolve(nextSpec);
    },

    measureText(text: string): { width: number } {
      if (state === null || text.length === 0) return { width: 0 };

      // Mirrors ParagraphLayoutEngine.computeGlyphAdvances exactly, including
      // the surrogate-pair skip and the missing-glyph estimate. Keep the two in
      // step: any divergence reintroduces the break/position width split this
      // backend exists to close.
      const raw = state.raw as { glyphForCodePoint(cp: number): { advanceWidth: number } | null };
      let width = 0;

      for (let i = 0; i < text.length; i++) {
        const codePoint = text.codePointAt(i)!;
        const advance = raw.glyphForCodePoint(codePoint)?.advanceWidth;
        width += advance != null ? advance * state.scale : state.size * MISSING_GLYPH_FACTOR;
        if (codePoint > 0xffff) i++;
      }

      return { width };
    },
  };
}
