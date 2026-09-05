/**
 * @vyaz/converters — HTML (and Markdown) → Vyaz model converter.
 *
 * ```ts
 * import { htmlToTextFrame } from '@vyaz/converters'
 * import { layoutTextFrame } from '@vyaz/core'
 * import { renderToSVG } from '@vyaz/renderer'
 *
 * const { frame, inlineBoxes, warnings, dropped } = htmlToTextFrame(html, { width: 600 })
 * const svg = renderToSVG(layoutTextFrame(frame), { preset: 'browser', inlineBoxes })
 * ```
 *
 * Lossy by design — a formatted-text importer, not a web-page renderer. See
 * `PLAN.md` for the coverage matrix.
 */
import type { TextFrame } from '@vyaz/core';
import { resolveOptions, type HtmlConvertOptions } from './options.js';
import { resolveRoot } from './dom.js';
import { Collector, type HtmlWarning, type DroppedNode } from './warnings.js';
import { walk } from './walk.js';

export type { HtmlConvertOptions, UnsupportedPolicy, ResolvedImage } from './options.js';
export type { HtmlWarning, DroppedNode } from './warnings.js';
export { markdownToTextFrame } from './markdown.js';
export type { MarkdownConvertOptions } from './markdown.js';

/** Result of {@link htmlToTextFrame}. */
export interface HtmlConvertResult {
  /** The converted frame — feed to `layoutTextFrame`. */
  frame: TextFrame;
  /** SVG fragments for inline boxes, keyed by `inlineWidget.id` — pass to `renderToSVG`. */
  inlineBoxes: Record<string, string>;
  /** Elements mapped with a simplification. */
  warnings: HtmlWarning[];
  /** Elements that produced no output. */
  dropped: DroppedNode[];
}

/**
 * Convert an HTML fragment to a {@link TextFrame}.
 *
 * @param html  an HTML string, a `Document`, or an `Element`. A string needs a
 *              DOM: the global `DOMParser`, or `options.parse`.
 */
export function htmlToTextFrame(
  html: string | Document | Element,
  options: HtmlConvertOptions = {},
): HtmlConvertResult {
  const opts = resolveOptions(options);
  const root = resolveRoot(html, opts);
  const col = new Collector();
  const inlineBoxes: Record<string, string> = {};

  const paragraphs = walk(root, opts, col, inlineBoxes);

  const frame: TextFrame = {
    width: opts.width,
    wrap: opts.wrap,
    paragraphs,
    defaultStyle: {
      fontFamily: opts.baseFamily,
      fontSize: opts.baseSize,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
    },
  };
  if (opts.width == null) delete (frame as { width?: number }).width;

  return { frame, inlineBoxes, warnings: col.warnings, dropped: col.dropped };
}
