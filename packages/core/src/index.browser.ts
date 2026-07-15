/**
 * @vyaz/core — Browser bundle entry point.
 *
 * Re-exports all browser-safe APIs. Forces bundlers to inline the modules
 * by using a single `export *`/re-export style that bun build inlines.
 *
 * ## Stability
 *
 * - **Stable**: types, layout engines, font metrics provider, compiler
 * - **@beta** — may change with reasonable notice
 * - **@internal** — implementation details, not for external use
 *
 * ❌ NOT exported: SystemFontRegistry / systemFontRegistry — requires `node:fs`
 */

// ── Layout Engine — stable ──────────────────────────────
export { ParagraphLayoutEngine, paragraphLayoutEngine } from './layout/ParagraphLayoutEngine.js';

/** @internal */
export { positionLines } from './layout/PositioningEngine.js';
/** @internal */
export { assertLineInvariants, linesToYAML } from './layout/LineBoxValidator.js';

// ── Utils — stable ─────────────────────────────────────
export { groupLinesByParagraph } from './utils/groupLinesByParagraph.js';

// ── TextFrame Layout Engine — stable ────────────────────
export { layoutTextFrame } from './layout/TextFrameLayoutEngine.js';

// ── Autofit — stable ────────────────────────────────────
export { applyScale, findScale } from './layout/AutoFitEngine.js';

// ── Compiler — stable ───────────────────────────────────
export { compileParagraph, getParagraphText, makeFontToken, collapseSegmentWhitespace, splitParagraphByHardBreaks } from './compile/DocumentCompiler.js';

// ── Font metrics — stable ───────────────────────────────
export { FontMetricsProvider, fontMetricsProvider } from './measure/FontMetricsProvider.js';
export { createFontFace, getGlyphAdvance, computePixelMetrics, isFontEngineAvailable } from './measure/FontEngine.js';
export { getFontBuffer } from './utils/font.js';

// ── Errors — stable ─────────────────────────────────────
export { FontNotFoundError } from './measure/FontNotFoundError.js';

// ── Types — stable ──────────────────────────────────────
// ⚠️ Bun's `bun build --target browser` does NOT inline object/array constants
//    when using `export { X } from 'module'` (known limitation — ConstValueInliningBundle is todo).
//    Using object spread forces the bundler to embed the actual values in the output.
import { DEFAULT_PARAGRAPH_STYLE as _DPS, DEFAULT_TEXT_STYLE as _DTS } from './types/Document.js';
/** @internal */
export const DEFAULT_PARAGRAPH_STYLE = { ..._DPS };
/** @internal */
export const DEFAULT_TEXT_STYLE = { ..._DTS };

/** @internal */
export { transformText } from './utils/textTransform.js';
// Same workaround for BULLET_CHARACTERS (object constant)
import { BULLET_CHARACTERS as _BC } from './utils/list.js';
/** @internal */
export const BULLET_CHARACTERS = { ..._BC };
/** @internal */
export { formatListNumber, defaultBulletChar } from './utils/list.js';
