/**
 * FontEngine.ts — unified facade over fontkit.
 *
 * Is the single entry point for all fontkit operations:
 *   - create(buffer) → font face
 *   - getGlyphAdvance(font, codePoint) → per‑glyph advance
 *   - getMetrics(font) → structured metric values
 *
 * fontkit works in both Node.js (native addon) and browser (dist/browser-module.mjs).
 * Bundlers pick the correct entry automatically when `package.json` browser map
 * is removed (or when the import is not blocked by stubs).
 */

import type { FontMetrics } from '../types/FontTypes.js';

// ── Internal font object shape ─────────────────────────────────────────
// We keep fontkit.Font opaque — users of FontEngine never import fontkit.

/** Opaque font face handle returned by FontEngine.create() */
export interface FontFace {
  /** fontkit font object (private — not meant for direct access) */
  readonly _raw: any;
  /** Cached values extracted once after creation */
  readonly unitsPerEm: number;
  readonly ascent: number;
  readonly descent: number;
  readonly capHeight: number;
  readonly winAscent: number | null;
  readonly winDescent: number | null;
}

// ── FontEngine ─────────────────────────────────────────────────────────

let _fontkitModule: any | null = null;

/**
 * Lazily import fontkit (avoids top‑level side‑effects in bundlers).
 * fontkit exposes both CJS and ESM browser builds — bundlers resolve
 * the correct entry from package.json exports.
 */
async function _getFontkit(): Promise<any> {
  if (_fontkitModule) return _fontkitModule;
  const mod = await import('fontkit');
  _fontkitModule = mod.default || mod;
  return _fontkitModule;
}

/**
 * Extract metric values from a raw fontkit font object.
 */
function _extractMetrics(raw: any): {
  unitsPerEm: number;
  ascent: number;
  descent: number;
  capHeight: number;
  winAscent: number | null;
  winDescent: number | null;
} {
  const os2 = raw['OS/2'];
  return {
    unitsPerEm: raw.unitsPerEm,
    ascent: raw.ascent,
    descent: raw.descent,
    capHeight: raw.capHeight ?? raw.ascent,
    winAscent: os2?.winAscent ?? null,
    winDescent: os2?.winDescent ?? null,
  };
}

/**
 * Get a glyph handle for a code point.
 * Returns null when the glyph is not present (e.g. .notdef).
 */
function _getGlyph(raw: any, codePoint: number): any | null {
  return raw.glyphForCodePoint(codePoint) ?? null;
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Create a font face from a binary buffer.
 *
 * @param buffer  Font file bytes (ArrayBuffer in browser, Uint8Array/Buffer in Node.js)
 * @returns       Opaque FontFace handle
 */
export async function createFontFace(buffer: ArrayBuffer | Uint8Array): Promise<FontFace> {
  const fontkit = await _getFontkit();
  const raw = fontkit.create(buffer);
  const metrics = _extractMetrics(raw);
  return {
    _raw: raw,
    ...metrics,
  };
}

/**
 * Get the advance width (in font units) for a single code point.
 *
 * @returns advance width in font units, or `null` if the glyph is missing
 */
export function getGlyphAdvance(font: FontFace, codePoint: number): number | null {
  const glyph = _getGlyph(font._raw, codePoint);
  if (!glyph) return null;
  return glyph.advanceWidth;
}

/**
 * Compute pixel‑scale metrics for a given font size.
 */
export function computePixelMetrics(font: FontFace, fontSize: number, mode: 'browser' | 'office'): FontMetrics {
  const scale = fontSize / font.unitsPerEm;

  if (mode === 'office' && font.winAscent != null && font.winDescent != null) {
    return {
      ascent: font.winAscent * scale * 1.078,
      descent: Math.abs(font.winDescent) * scale * 1.078,
      capHeight: (font.capHeight ?? font.ascent) * scale,
      unitsPerEm: font.unitsPerEm,
      sourceTable: 'OS/2',
    };
  }

  // browser mode (or Office fallback when OS/2 is absent)
  return {
    ascent: font.ascent * scale,
    descent: Math.abs(font.descent) * scale,
    capHeight: (font.capHeight ?? font.ascent) * scale,
    unitsPerEm: font.unitsPerEm,
    sourceTable: 'hhea',
  };
}

/**
 * Whether the fontkit module was successfully loaded.
 * Useful for tests to verify the bundler isn't blocking fontkit.
 */
export async function isFontEngineAvailable(): Promise<boolean> {
  try {
    const fk = await _getFontkit();
    return typeof fk.create === 'function';
  } catch {
    return false;
  }
}