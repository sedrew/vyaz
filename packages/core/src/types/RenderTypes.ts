/**
 * RenderTypes.ts — типы, общие для всех рендереров (SVG, Canvas и др.).
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
