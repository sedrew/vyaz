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
export {
  DEFAULT_PARAGRAPH_STYLE,
  DEFAULT_TEXT_STYLE,
} from './types/Document.js';
export { transformText } from './utils/textTransform.js';
export { formatListNumber, defaultBulletChar, BULLET_CHARACTERS } from './utils/list.js';
