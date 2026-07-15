/**
 * @vyaz/core — Browser entry point.
 *
 * Re-exports everything from the main index **except** `SystemFontRegistry`
 * and `systemFontRegistry`, which require Node.js built-in modules
 * (`node:fs`, `get-system-fonts`).
 *
 * All server-only code paths are guarded by runtime checks (`isNodeLike`)
 * so tree-shakers can safely eliminate dead branches.
 *
 * ✅ Safe for Vite / webpack / Rollup / esbuild browser builds.
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

// ── Layout Engine (browser‑safe: uses Canvas 2D measureText fallback) ──
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

// ── Compiler (browser‑safe: FontMetricsProvider falls back to Canvas) ──
export { compileParagraph, getParagraphText, makeFontToken } from './compile/DocumentCompiler.js';
export type { PreparedRichInlineItem } from './compile/DocumentCompiler.js';

// ── Font metrics (browser‑safe: canvas-polyfill has runtime guards) ────
export { FontMetricsProvider, fontMetricsProvider } from './measure/FontMetricsProvider.js';

// ── Errors ──────────────────────────────────────────────────────────────
export { FontNotFoundError } from './measure/FontNotFoundError.js';

// ❌ NOT exported in browser entry:
//   - SystemFontRegistry / systemFontRegistry — requires `node:fs` + `get-system-fonts`