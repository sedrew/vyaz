/**
 * Render types shared across all renderers (SVG, Canvas, etc.).
 */

export interface DebugFlags {
  /** Frame container bounding box (frameWidth × frameHeight) */
  frameBox?: boolean;
  /** Actual content bounding box (BBox of all lines) */
  contentBox?: boolean;
  /** Paragraph bounding boxes (grouped by paragraphId). */
  paragraphBox?: boolean;
  /** Stroke width (px) for all debug border lines. Default 1. */
  widthBorder?: number;
  /** Show filled rect for each line's lineHeight (background fill). */
  lineGap?: boolean;
  /** Line box outline */
  box?: boolean;
  /** Baseline line */
  baseline?: boolean;
  /** Ascent/descent lines */
  ascentDescent?: boolean;
  /** Coordinate labels */
  labels?: boolean;
  /** Run rectangles */
  runs?: boolean;
  /** @deprecated Use frameBox instead */
  frame?: boolean;
}

// ── SVG AST types ────────────────────────────────────────────────────────

/**
 * A generic SVG element node in the AST.
 */
export interface SvgElement {
  type: 'element';
  tag: string;
  attrs: Record<string, string | number | undefined>;
  children: SvgNode[];
}

/**
 * A text node inside an SVG element (escaped on serialization).
 */
export interface SvgTextNode {
  type: 'text';
  value: string;
}

/**
 * A raw content node — output verbatim without escaping.
 * Used for pre-rendered debug overlay markup.
 */
export interface SvgRawNode {
  type: 'raw';
  value: string;
}

/**
 * An SVG comment node.
 */
export interface SvgCommentNode {
  type: 'comment';
  value: string;
}

export type SvgNode = SvgElement | SvgTextNode | SvgRawNode | SvgCommentNode;