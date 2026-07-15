/**
 * @vyaz/core — Browser bundle entry point.
 *
 * Re-exports all browser-safe APIs. Forces bundlers to inline the modules
 * by using a single `export *`/re-export style that bun build inlines.
 *
 * ❌ NOT exported: SystemFontRegistry / systemFontRegistry — requires `node:fs`
 */

// ── Layout Engine ───────────────────────────────────────
export { ParagraphLayoutEngine, paragraphLayoutEngine } from './layout/ParagraphLayoutEngine.js';
export { positionLines } from './layout/PositioningEngine.js';
export { assertLineInvariants, linesToYAML } from './layout/LineBoxValidator.js';

// ── TextFrame Layout Engine ─────────────────────────────
export { layoutTextFrame } from './layout/TextFrameLayoutEngine.js';

// ── Autofit ─────────────────────────────────────────────
export { applyScale, findScale } from './layout/AutoFitEngine.js';

// ── Compiler ────────────────────────────────────────────
export { compileParagraph, getParagraphText, makeFontToken, collapseSegmentWhitespace, splitParagraphByHardBreaks } from './compile/DocumentCompiler.js';

// ── Font metrics ────────────────────────────────────────
export { FontMetricsProvider, fontMetricsProvider } from './measure/FontMetricsProvider.js';
export { createFontFace, getGlyphAdvance, computePixelMetrics, isFontEngineAvailable } from './measure/FontEngine.js';
export { getFontBuffer } from './utils/font.js';

// ── Errors ──────────────────────────────────────────────
export { FontNotFoundError } from './measure/FontNotFoundError.js';

// ── Types (re-exported as values for inline, but imported as types) ─────
// ⚠️ Bun's `bun build --target browser` does NOT inline object/array constants
//    when using `export { X } from 'module'` (known limitation — ConstValueInliningBundle is todo).
//    Using object spread forces the bundler to embed the actual values in the output.
import { DEFAULT_PARAGRAPH_STYLE as _DPS, DEFAULT_TEXT_STYLE as _DTS } from './types/Document.js';
export const DEFAULT_PARAGRAPH_STYLE = { ..._DPS };
export const DEFAULT_TEXT_STYLE = { ..._DTS };
export { transformText } from './utils/textTransform.js';
// Same workaround for BULLET_CHARACTERS (object constant)
import { BULLET_CHARACTERS as _BC } from './utils/list.js';
export const BULLET_CHARACTERS = { ..._BC };
export { formatListNumber, defaultBulletChar } from './utils/list.js';
