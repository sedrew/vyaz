/**
 * @vyaz/core — Public API.
 *
 * ## Stability
 *
 * - **Stable**: types, layout engines, font metrics provider, compiler
 * - **@beta** — may change with reasonable notice
 * - **@internal** — implementation details, not for external use
 *
 * ## Environments
 *
 * - `index.ts` (Node.js / Bun) — full API including SystemFontRegistry
 * - `index.browser.ts` (browser) — browser-safe subset (no node:fs)
 */

// ── Input types (Logical level) — stable ───────────────────────────────
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
  ResolvedTextRun,
} from './types/Document.js';
// ⚠️ Bun's `bun build --target bun` (and `--target node`) has the same const-inlining
//    limitation as `--target browser`. Using object spread forces the bundler
//    to embed actual values in the output bundle.
import { DEFAULT_PARAGRAPH_STYLE as _DPS2, DEFAULT_TEXT_STYLE as _DTS2 } from './types/Document.js';
import type { ParagraphStyle } from './types/Document.js';
/** @internal */
export const DEFAULT_PARAGRAPH_STYLE: ParagraphStyle = { ..._DPS2 };
/** @internal */
export const DEFAULT_TEXT_STYLE: Partial<import('./types/Document.js').TextRun> = { ..._DTS2 };

// ── Output types (Physical Box Model) — stable ─────────────────────────
export type {
  ParagraphLayoutResult,
  Line,
  Span,
  SpanFontMetrics,
  LayoutWarning,
  SemanticParagraph,
  SemanticLine,
  SemanticFragment,
} from './types/LayoutTypes.js';

// ── Font types — stable ────────────────────────────────────────────────
export type {
  FontMetrics,
  IFontMetricsProvider,
  GlyphData,
} from './types/FontTypes.js';

// ── Layout Engine — stable ─────────────────────────────────────────────
export { ParagraphLayoutEngine, paragraphLayoutEngine } from './layout/ParagraphLayoutEngine.js';

/**
 * @internal List layout positions lines within a paragraph box.
 * Used internally by ParagraphLayoutEngine.
 */
export { positionLines } from './layout/PositioningEngine.js';

// Line-box invariant checks and YAML snapshots moved to the `@vyaz/core/debug`
// entry so `js-yaml` and the debug code stay out of the production bundle.

// ── TextFrame Layout Engine — stable ────────────────────────────────────
export { layoutTextFrame } from './layout/TextFrameLayoutEngine.js';
export { createLayoutEngine } from './layout/create-engine.js';
export type { LayoutEngine, LayoutEngineOptions } from './layout/create-engine.js';
export type { TextFrameLayoutResult, LayoutOptions, AutofitOutcome } from './layout/TextFrameLayoutEngine.js';
export type { OnMissingFont } from './layout/resolve-font.js';

// ── Autofit — stable ───────────────────────────────────────────────────
export { applyScale, findScale } from './layout/AutoFitEngine.js';
export type { AutoFitOptions, AutoFitResult } from './layout/AutoFitEngine.js';

// ── Utils — stable ──────────────────────────────────────────────────────
export { groupLinesByParagraph } from './utils/groupLinesByParagraph.js';
export type { ParagraphGroup } from './utils/groupLinesByParagraph.js';

/**
 * @internal Text transformation (uppercase, lowercase, capitalize).
 */
export { transformText } from './utils/textTransform.js';
// Same workaround for BULLET_CHARACTERS (object constant) — Bun's bun build
// does not inline const objects with `export { X } from 'module'`.
import { formatListNumber as _fln, defaultBulletChar as _dbc, BULLET_CHARACTERS as _BC2 } from './utils/list.js';
import type { NumberFormat } from './types/Document.js';
/** @internal */
export const formatListNumber: (n: number, format: NumberFormat) => string = _fln;
/** @internal */
export const defaultBulletChar: (level: number) => string = _dbc;
/** @internal */
export const BULLET_CHARACTERS: Record<number, string> = { ..._BC2 };

// ── Compiler — stable ──────────────────────────────────────────────────
export { compileParagraph, getParagraphText, makeFontToken, splitParagraphByHardBreaks, collapseSegmentWhitespace } from './compile/ParagraphCompiler.js';
export type { PreparedRichInlineItem } from './compile/ParagraphCompiler.js';

// ── Font Engine — stable ────────────────────────────────────────────────
export type { FontFace } from './measure/FontEngine.js';
export { createFontFace, getGlyphAdvance, computePixelMetrics, isFontEngineAvailable, shapeRun } from './measure/FontEngine.js';
export type { ShapedRun, ShapedGlyph } from './measure/FontEngine.js';
export { setMeasureProfile, getMeasureProfile, measurePx } from './measure/FontkitMeasureContext.js';
export type { MeasureProfile } from './measure/FontkitMeasureContext.js';

// ── Font metrics — stable ──────────────────────────────────────────────
export { FontMetricsProvider, fontMetricsProvider } from './measure/FontMetricsProvider.js';

// ── System font registry — stable (Node.js only) ────────────────────────
export { SystemFontRegistry, systemFontRegistry } from './measure/SystemFontRegistry.js';

// ── Font utilities — stable ─────────────────────────────────────────────
export { getFontBuffer } from './utils/font.js';

// ── Errors — stable ────────────────────────────────────────────────────
export { FontNotFoundError } from './measure/FontNotFoundError.js';
