/**
 * Document.ts — Input types (Logical level).
 *
 * Hierarchy: TextFrame → Paragraph[] → TextRun[]
 *
 * TextFrame is the root container (a text box on canvas).
 * Paragraph is the block-level unit (paragraph with spacing, alignment).
 * TextRun is the inline-level unit (a styled text fragment).
 *
 * Based on W3C CSS Text, CSS Writing Modes, CSS Multi-column specs.
 *
 * @see {@link https://www.w3.org/TR/css-text-3/ | CSS Text Module Level 3}
 * @see {@link https://www.w3.org/TR/css-writing-modes-3/ | CSS Writing Modes Level 3}
 * @see {@link https://www.w3.org/TR/css-multicol-1/ | CSS Multi-column Layout Level 1}
 */

// ── Union types ─────────────────────────────────────────────────────────

/**
 * Block flow direction (writing mode).
 *
 * Determines how lines stack relative to each other:
 * - `horizontal-tb`: lines flow horizontally top-to-bottom (Latin, Cyrillic, default).
 * - `vertical-rl`: lines flow vertically right-to-left (traditional CJK).
 * - `vertical-lr`: lines flow vertically left-to-right (Mongolian, some UI scenarios).
 *
 * **Layout impact:**
 *  Under `horizontal-tb`, `wrap` clips by **width**, `autofit` shrinks by **height**.
 *  Under `vertical-*`, `wrap` clips by **height**, `autofit` shrinks by **width**
 *  (width and height swap roles).
 *
 * @see {@link https://www.w3.org/TR/css-writing-modes-3/#block-flow | CSS Writing Modes: block flow}
 */
export type WritingMode = 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';

/**
 * Character orientation inside a vertical line.
 *
 * Only applies when `writingMode !== 'horizontal-tb'`:
 * - `mixed`: Latin digits/letters are rotated 90°, CJK glyphs remain upright.
 * - `upright`: **all** characters stand upright (stacked vertically).
 * - `sideways`: the whole text block is rotated 90° (like a rotated box).
 *
 * @see {@link https://www.w3.org/TR/css-writing-modes-3/#text-orientation | CSS Writing Modes: text-orientation}
 */
export type TextOrientation = 'mixed' | 'upright' | 'sideways';

/**
 * Horizontal text alignment within a line.
 *
 * @see {@link https://www.w3.org/TR/css-text-3/#text-align-property | CSS Text: text-align}
 */
export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

/**
 * Alignment of the **last** line in a justified paragraph.
 *
 * @see {@link https://www.w3.org/TR/css-text-3/#text-align-last-property | CSS Text: text-align-last}
 * @todo Not yet implemented in the layout engine.
 */
export type TextAlignLast = 'auto' | 'start' | 'end' | 'left' | 'right' | 'center' | 'justify';

/**
 * Word-break rules (how to break lines within words).
 *
 * @see {@link https://www.w3.org/TR/css-text-3/#word-break-property | CSS Text: word-break}
 * @todo Not yet implemented in the layout engine.
 */
export type WordBreak = 'normal' | 'break-all' | 'keep-all' | 'break-word';

/**
 * Strictness of line-break rules (mainly for CJK).
 *
 * @see {@link https://www.w3.org/TR/css-text-3/#line-break-property | CSS Text: line-break}
 * @todo Not yet implemented in the layout engine.
 */
export type LineBreak = 'auto' | 'loose' | 'normal' | 'strict' | 'anywhere';

/**
 * Overflow wrap behavior (whether long words can break).
 *
 * @see {@link https://www.w3.org/TR/css-text-3/#overflow-wrap-property | CSS Text: overflow-wrap}
 * @todo Not yet implemented in the layout engine.
 */
export type OverflowWrap = 'normal' | 'break-word' | 'anywhere';

/**
 * Text decoration line style.
 *
 * @see {@link https://www.w3.org/TR/css-text-decor-3/#text-decoration-style-property | CSS Text Decoration: text-decoration-style}
 * @todo Not yet implemented in the layout engine.
 */
export type TextDecorationStyle = 'solid' | 'double' | 'dotted' | 'dashed' | 'wavy';

/**
 * Text case transform.
 *
 * @see {@link https://www.w3.org/TR/css-text-3/#text-transform-property | CSS Text: text-transform}
 * @todo Not yet implemented in the layout engine.
 */
export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

/**
 * Dominant baseline used for vertical alignment within a line.
 *
 * @see {@link https://www.w3.org/TR/css-inline-3/#dominant-baseline-property | CSS Inline Layout: dominant-baseline}
 * @todo Not yet implemented in the layout engine.
 */
export type DominantBaseline = 'auto' | 'text-bottom' | 'alphabetic' | 'ideographic' | 'middle' | 'central' | 'mathematical' | 'hanging' | 'text-top';

/**
 * Edge used to measure the line box height (font metric edge).
 *
 * @see {@link https://www.w3.org/TR/css-inline-3/#line-fit-edge | CSS Inline Layout: line-fit-edge}
 * @todo Not yet implemented in the layout engine.
 */
export type LineFitEdge = 'leading' | 'text' | 'cap' | 'ex' | 'ideographic' | 'ideographic-ink' | 'alphabetic';

/**
 * Vertical alignment of the whole text block inside the frame.
 *
 * - `top`: text starts at the top edge.
 * - `middle`: text is centered vertically.
 * - `bottom`: text sits at the bottom edge.
 */
export type VerticalAlignment = 'top' | 'middle' | 'bottom';

/**
 * Subscript / superscript script mode.
 *
 * - `normal`: no script shift.
 * - `sub`: subscript (lowered, smaller).
 * - `super`: superscript (raised, smaller).
 */
export type ScriptType = 'normal' | 'sub' | 'super';

/**
 * CSS `white-space` equivalent.
 *
 * Controls how whitespace and line breaks are handled inside a paragraph.
 *
 * @see {@link https://www.w3.org/TR/css-text-3/#white-space-property | CSS Text: white-space}
 */
export type WhiteSpace = 'normal' | 'nowrap' | 'pre';

// ── Autofit ─────────────────────────────────────────────────────────────

/**
 * Configuration for automatic font-size reduction (autofit).
 *
 * When `enabled` is true, the layout engine will scale down the font size
 * of **all** runs proportionally so the text fits inside the frame's
 * `width` × `height`. The scaling stops at `minFontSize`.
 *
 * @example
 * ```ts
 * { enabled: true, minFontSize: 10, maxFontSize: 24, baseFontSize: 18 }
 * ```
 *
 * @see {@link TextFrame.autofit}
 */
export interface AutofitConfig {
  /** Whether autofit is active. */
  enabled: boolean;
  /**
   * Minimum font size in px.
   * The engine will never shrink text below this threshold.
   */
  minFontSize?: number;
  /**
   * Maximum font size in px.
   * The engine will never grow text above this threshold.
   */
  maxFontSize?: number;
  /**
   * Base font size used as a reference when `TextRun.fontSize`
   * is interpreted as a relative scale factor.
   *
   * @todo Currently `TextRun.fontSize` is absolute px.
   *       In future it may be a ratio relative to this base.
   */
  baseFontSize?: number;
}

// ── TextRun (inline-level) ──────────────────────────────────────────────

/**
 * A single inline run of styled text.
 *
 * This replaces the earlier `TextRunNode` + `TextStyleNode` pair;
 * all style properties are **flattened** directly onto the run.
 *
 * Each run represents a continuous piece of text with uniform styling.
 * Consecutive runs with different styles are split by the input parser.
 *
 * @example
 * ```ts
 * { text: "Hello", fontFamily: "Arial", fontSize: 16, fontWeight: "bold", color: "#000" }
 * ```
 */
export interface TextRun {
  /**
   * Run kind:
   * - `'text'` — plain text (the most common case).
   * - `'inline-box'` — an inline widget placeholder (`\uFFFC`).
   */
  type: 'text' | 'inline-box';
  /** The text content of this run (or `\uFFFC` for inline-box). */
  text: string;
  /**
   * Inline widget data (only when `type === 'inline-box'`).
   * Represents an embedded object (image, icon, etc.) that sits
   * inside the text flow.
   */
  inlineWidget?: InlineWidget;

  // ── Flattened style ───────────────────────────────────────────────

  /** Font family name (e.g. `"Arial"`, `"Times New Roman"`). */
  fontFamily: string;
  /** Font size in px. */
  fontSize: number;
  /** Font weight: `'normal'`, `'bold'`, or a numeric CSS weight (100–900). */
  fontWeight: 'normal' | 'bold' | number;
  /** Font style. */
  fontStyle: 'normal' | 'italic';
  /** Text color in any CSS-compatible format (hex, rgb, named). */
  color: string;
  /** Background color (optional). */
  backgroundColor?: string;
  /** Letter-spacing (tracking) in px. `0` means default. */
  letterSpacing?: number;
  /** Subscript / superscript override. */
  script?: ScriptType;

  // ── Text decoration ───────────────────────────────────────────────

  /** Underline decoration. */
  underline?: boolean;
  /** Strikethrough decoration. */
  strikethrough?: boolean;
  /** Overline decoration. @todo Not yet implemented. */
  overline?: boolean;
  /** Underline / overline / strikethrough line style. @todo Not yet implemented. */
  textDecorationStyle?: TextDecorationStyle;
  /** Underline / overline / strikethrough line color. @todo Not yet implemented. */
  textDecorationColor?: string;

  // ── Text transform ────────────────────────────────────────────────

  /** Case transform (uppercase, lowercase, capitalize). @todo Not yet implemented. */
  textTransform?: TextTransform;
  /** Force full-width characters (CJK). @todo Not yet implemented. */
  fullWidth?: boolean;
  /** Convert small kana to full-size kana. @todo Not yet implemented. */
  fullSizeKana?: boolean;
}

/**
 * Data for an inline widget (embedded object inside text flow).
 *
 * Inline widgets behave like a single character glyph with a fixed
 * width and height. They sit on the baseline by default.
 *
 * @example
 * An inline icon (24×24 px) embedded in a sentence:
 * ```ts
 * { width: 24, height: 24, baselineOffset: 0 }
 * ```
 */
export interface InlineWidget {
  /** Width of the widget in px. */
  width: number;
  /** Height of the widget in px. */
  height: number;
  /**
   * Offset from the baseline (in px).
   * Positive = widget descends below the baseline.
   * Negative = widget ascends above the baseline.
   */
  baselineOffset?: number;
}

// ── Paragraph (block-level) ─────────────────────────────────────────────

/**
 * Block-level style for a paragraph.
 *
 * Controls alignment, spacing, indentation,
 * and line-breaking rules for all runs inside the paragraph.
 *
 * @see {@link https://www.w3.org/TR/css-text-3/ | CSS Text Module Level 3}
 */
export interface ParagraphStyle {
  /** Horizontal text alignment. */
  alignment: TextAlignment;
  /**
   * Line height as a **multiplier** relative to the font size.
   * E.g. `1.4` means 1.4× the computed font height.
   *
   * @todo Support for absolute px values via a `lineHeightUnit` field.
   */
  lineHeight: number;
  /** Space **before** this paragraph (top margin) in px. */
  spaceBefore: number;
  /** Space **after** this paragraph (bottom margin) in px. */
  spaceAfter: number;
  /**
   * Left indent (first-line indent / "red line") in px.
   * Applies only to the first line of the paragraph.
   *
   * @todo Rename or alias as `textIndent` for consistency with CSS.
   */
  indent?: number;
  /** Left margin for the whole paragraph in px. */
  leftIndent?: number;
  /** Right margin for the whole paragraph in px. */
  rightIndent?: number;
  /**
   * Indentation of the first line in px.
   * If set, overrides the generic `indent` for the first line.
   *
   * @todo Not yet implemented in the layout engine.
   */
  textIndent?: number;
  /** Letter-spacing (tracking) for the whole paragraph in px. */
  letterSpacing?: number;
  /**
   * Alignment of the **last** line of a justified paragraph.
   * @todo Not yet implemented.
   */
  textAlignLast?: TextAlignLast;
  /**
   * Word-break rules (CJK / non-CJK).
   * @todo Not yet implemented.
   */
  wordBreak?: WordBreak;
  /**
   * Line-break strictness (CJK).
   * @todo Not yet implemented.
   */
  lineBreak?: LineBreak;
  /**
   * Overflow-wrap / word-wrap behaviour.
   * @todo Not yet implemented.
   */
  overflowWrap?: OverflowWrap;
  /**
   * Whether hyphenation is allowed.
   * @todo Not yet implemented.
   */
  hyphens?: boolean;
  /**
   * CSS `white-space` behaviour:
   * - `'normal'`: collapse whitespace, auto-wrap.
   * - `'nowrap'`: collapse whitespace, no wrap.
   * - `'pre'`: preserve whitespace, wrap on newline only.
   */
  whiteSpace?: WhiteSpace;
}

/**
 * A single paragraph (block-level text container).
 *
 * Contains one or more `TextRun` children that form the paragraph content.
 *
 * @example
 * ```ts
 * {
 *   id: "p-1",
 *   style: { alignment: "left", lineHeight: 1.4, spaceBefore: 0, spaceAfter: 12 },
 *   children: [
 *     { text: "Hello ", fontFamily: "Arial", fontSize: 16, fontWeight: "bold", color: "#000" },
 *     { text: "world!", fontFamily: "Arial", fontSize: 16, fontWeight: "normal", color: "#333" },
 *   ]
 * }
 * ```
 */
export interface Paragraph {
  /** Unique identifier for this paragraph (optional, for debugging). */
  id?: string;
  /** Block-level paragraph style. */
  style: ParagraphStyle;
  /** Inline-level text runs forming the paragraph. */
  children: TextRun[];
}

// ── Multi-column config ─────────────────────────────────────────────────

/**
 * Configuration for multi-column layout (flowing columns).
 *
 * Follows the CSS Multi-column Layout model:
 * the **parent** frame holds a single flow of paragraphs;
 * the layout engine automatically breaks the content into columns
 * based on `columnCount` and `columnGap`.
 *
 * Columns are **not** independent containers with their own paragraphs.
 * If you need independent columns (each with separate content),
 * use multiple `TextFrame` instances placed side-by-side.
 *
 * @see {@link https://www.w3.org/TR/css-multicol-1/ | CSS Multi-column Layout Level 1}
 * @todo Not yet implemented in the layout engine.
 */
export interface MultiColumnConfig {
  /** Number of columns (like CSS `column-count`). */
  count: number;
  /** Gap between columns in px (like CSS `column-gap`). */
  gap: number;
}

// ── TextFrame (root container) ──────────────────────────────────────────

/**
 * Root text container — a text box on a canvas.
 *
 * This replaces the earlier `RichTextDocument`.
 * It holds geometry, text flow settings, and the paragraph array.
 *
 * **Wrap & Autofit interaction:**
 * - When `wrap` is `true`, the layout engine breaks lines at `width`.
 * - When `autofit.enabled` is `true`, the engine shrinks the font
 *   proportionally to fit the text inside `width` × `height`.
 *
 * @example
 * ```ts
 * {
 *   width: 600,
 *   height: 400,
 *   wrap: true,
 *   autofit: { enabled: true, minFontSize: 10, maxFontSize: 24 },
 *   writingMode: "horizontal-tb",
 *   verticalAlignment: "top",
 *   paragraphs: [ /* ... *\/ ]
 * }
 * ```
 */
export interface TextFrame {
  /**
   * Container width in px.
   *
   * When set — text wraps by this width (if `wrap=true`). Used as the inline-size
   * for horizontal-tb writing mode. When `undefined` — auto (fit-content).
   */
  width?: number;
  /**
   * Container height in px.
   *
   * When set — may clip content or trigger autofit. When `undefined` — auto
   * (content determines height, `contentHeight` from the layout result).
   */
  height?: number;
  /**
   * Whether line wrapping is enabled.
   * `true` = lines break when they exceed `width` (or `height` in vertical mode).
   * `false` = text overflows (may be clipped or trigger autofit).
   */
  wrap: boolean;
  /** Autofit (auto font-size reduction) configuration. */
  autofit?: AutofitConfig;
  /**
   * Writing mode (block flow direction).
   * Defaults to `'horizontal-tb'` when absent.
   */
  writingMode?: WritingMode;
  /**
   * Character orientation in vertical mode.
   * Ignored when `writingMode === 'horizontal-tb'`.
   */
  textOrientation?: TextOrientation;
  /**
   * Base text direction (important for bidi).
   * `'ltr'` = left-to-right, `'rtl'` = right-to-left.
   */
  direction?: 'ltr' | 'rtl';
  /** Vertical alignment of the content block inside the frame. */
  verticalAlignment?: VerticalAlignment;
  /**
   * Dominant baseline for inline alignment.
   * @todo Not yet implemented.
   */
  dominantBaseline?: DominantBaseline;
  /**
   * Font metric edge used for line box height.
   * @todo Not yet implemented.
   */
  lineFitEdge?: LineFitEdge;
  /**
   * Inner padding of the frame.
   * Text layout starts at `x + padding.left`, `y + padding.top`.
   */
  padding?: {
    /** Top padding in px. */
    top: number;
    /** Right padding in px. */
    right: number;
    /** Bottom padding in px. */
    bottom: number;
    /** Left padding in px. */
    left: number;
  };
  /**
   * Multi-column layout configuration.
   * When set, paragraphs are automatically broken into columns.
   * @todo Not yet implemented.
   */
  columns?: MultiColumnConfig;
  /** Paragraphs forming the text content. */
  paragraphs: Paragraph[];
  /**
   * Default style inherited by all `TextRun` children.
   * Any field omitted in a `TextRun` will fall back to this value.
   */
  defaultStyle?: Partial<Omit<TextRun, 'text' | 'type' | 'inlineWidget'>>;
}

// ── Default values ──────────────────────────────────────────────────────

/**
 * Default paragraph style used when a `Paragraph` omits its `style` field.
 */
export const DEFAULT_PARAGRAPH_STYLE: ParagraphStyle = {
  alignment: 'left',
  lineHeight: 1.15,
  spaceBefore: 0,
  spaceAfter: 0,
  whiteSpace: 'normal',
};

/**
 * Default text style used when a `TextRun` omits style fields
 * and no `defaultStyle` is set on the `TextFrame`.
 */
export const DEFAULT_TEXT_STYLE: Partial<TextRun> = {
  fontFamily: 'Arial',
  fontSize: 12,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
};