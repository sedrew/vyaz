/**
 * Render types shared across all renderers (SVG, Canvas, etc.).
 */

export interface DebugFlags {
  /** Frame container bounding box (frameWidth × frameHeight) */
  frameBox?: boolean;
  /** Actual content bounding box (BBox of all lines) */
  contentBox?: boolean;
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