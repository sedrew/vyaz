/**
 * Render types shared across all renderers (SVG, Canvas, etc.).
 */

export interface DebugFlags {
  box?: boolean;
  baseline?: boolean;
  ascentDescent?: boolean;
  frame?: boolean;
  labels?: boolean;
  runs?: boolean;
  /** Show filled rect for each line's lineHeight (background fill). */
  lineGap?: boolean;
}