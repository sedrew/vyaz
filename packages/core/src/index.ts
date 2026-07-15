/**
 * @vyaz/core — Public API.
 *
 * Exports input types (Logical level), output types (Physical Box Model),
 * layout engines, font metric providers, renderers, and utilities.
 */

// ── Input types (Logical level) ─────────────────────────────────────────
export type {
  TextFrame,
  Paragraph,
  ParagraphStyle,
  TextRun,
  InlineWidget,
  AutofitConfig,
  TextAlignment,
  WritingMode,
  TextOrientation,
  VerticalAlignment,
  ScriptType,
  WhiteSpace,
  MultiColumnConfig,
  DominantBaseline,
  LineFitEdge,
  TextAlignLast,
  WordBreak,
  LineBreak,
  OverflowWrap,
  TextDecorationStyle,
  TextTransform,
  ListType,
  NumberFormat,
  ListStylePosition,
  ListStyle,
} from './types/Document.js';
// ⚠️ Bun's `bun build --target bun` (and `--target node`) has the same const-inlining
//    limitation as `--target browser`. Using object spread forces the bundler
//    to embed actual values in the output bundle.
import { DEFAULT_PARAGRAPH_STYLE as _DPS2, DEFAULT_TEXT_STYLE as _DTS2 } from './types/Document.js';
export const DEFAULT_PARAGRAPH_STYLE = { ..._DPS2 };
export const DEFAULT_TEXT_STYLE = { ..._DTS2 };

// ── Output types (Physical Box Model) ───────────────────────────────────
export type {
  ParagraphLayoutResult,
  Line,
  Span,
  SpanFontMetrics,
  SemanticParagraph,
  SemanticLine,
  SemanticFragment,
} from './types/LayoutTypes.js';

// ── Font types ──────────────────────────────────────────────────────────
export type {
  FontMetrics,
  IFontMetricsProvider,
  GlyphData,
} from './types/FontTypes.js';

// ── Layout Engine ───────────────────────────────────────────────────────
export { ParagraphLayoutEngine, paragraphLayoutEngine } from './layout/ParagraphLayoutEngine.js';
export { positionLines } from './layout/PositioningEngine.js';
export { assertLineInvariants, linesToYAML } from './layout/LineBoxValidator.js';
export type { InvariantError } from './layout/LineBoxValidator.js';

// ── TextFrame Layout Engine ──────────────────────────────────────────────
export { layoutTextFrame } from './layout/TextFrameLayoutEngine.js';
export type { TextFrameLayoutResult } from './layout/TextFrameLayoutEngine.js';

// ── Autofit ─────────────────────────────────────────────────────────────
export { applyScale, findScale } from './layout/AutoFitEngine.js';
export type { AutoFitOptions, AutoFitResult } from './layout/AutoFitEngine.js';

// ── Utils ────────────────────────────────────────────────────────────────
export { groupLinesByParagraph } from './utils/groupLinesByParagraph.js';
export type { ParagraphGroup } from './utils/groupLinesByParagraph.js';
export { transformText } from './utils/textTransform.js';
// Same workaround for BULLET_CHARACTERS (object constant) — Bun's bun build
// does not inline const objects with `export { X } from 'module'`.
import { formatListNumber as _fln, defaultBulletChar as _dbc, BULLET_CHARACTERS as _BC2 } from './utils/list.js';
export const formatListNumber = _fln;
export const defaultBulletChar = _dbc;
export const BULLET_CHARACTERS = { ..._BC2 };

// ── Compiler ────────────────────────────────────────────────────────────
export { compileParagraph, getParagraphText, makeFontToken, splitParagraphByHardBreaks, collapseSegmentWhitespace } from './compile/DocumentCompiler.js';
export type { PreparedRichInlineItem } from './compile/DocumentCompiler.js';

// ── Font Engine ──────────────────────────────────────────────────────────
export type { FontFace } from './measure/FontEngine.js';
export { createFontFace, getGlyphAdvance, computePixelMetrics, isFontEngineAvailable } from './measure/FontEngine.js';

// ── Font metrics ────────────────────────────────────────────────────────
export { FontMetricsProvider, fontMetricsProvider } from './measure/FontMetricsProvider.js';

// ── System font registry ────────────────────────────────────────────────
export { SystemFontRegistry, systemFontRegistry } from './measure/SystemFontRegistry.js';

// ── Font utilities ───────────────────────────────────────────────────────
export { getFontBuffer } from './utils/font.js';

// ── Errors ──────────────────────────────────────────────────────────────
export { FontNotFoundError } from './measure/FontNotFoundError.js';
