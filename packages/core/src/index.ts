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
} from './types/Document.js';
export {
  DEFAULT_PARAGRAPH_STYLE,
  DEFAULT_TEXT_STYLE,
} from './types/Document.js';

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

// ── Compiler ────────────────────────────────────────────────────────────
export { compileParagraph, getParagraphText, makeFontToken } from './compile/DocumentCompiler.js';
export type { PreparedRichInlineItem } from './compile/DocumentCompiler.js';

// ── Font metrics ────────────────────────────────────────────────────────
export { FontMetricsProvider, fontMetricsProvider } from './measure/FontMetricsProvider.js';