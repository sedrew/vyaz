/**
 * markdown.ts — Markdown → Vyaz model, via HTML.
 *
 * Markdown is parsed to an HTML string with `marked` (CommonMark + GFM —
 * tables, strikethrough, task lists, autolinks), then that HTML string goes
 * through the exact same `htmlToTextFrame` pipeline as hand-authored HTML.
 * No separate walker, no separate table/list/inline-formatting logic —
 * everything `@vyaz/converters` already knows how to convert from HTML
 * (including tables and clickable links) works here for free, and stays in
 * sync automatically as that HTML path grows (img/svg inline boxes, etc.).
 *
 * Raw HTML embedded in the Markdown source — CommonMark explicitly allows
 * this: an inline `<span style="…">` inside a paragraph, or a block-level
 * `<table>`/`<div>`/… — is preserved verbatim by `marked` in its HTML
 * output. It then flows into `htmlToTextFrame` as ordinary HTML, no
 * special-casing needed here at all. That is a direct consequence of going
 * through a real HTML string as the intermediate form, rather than walking
 * Markdown's own AST directly and having to reimplement HTML handling
 * inside it.
 */
import { marked } from 'marked';
import { htmlToTextFrame, type HtmlConvertOptions, type HtmlConvertResult } from './index.js';

export interface MarkdownConvertOptions extends HtmlConvertOptions {
  /** Options forwarded to `marked.parse()`. */
  markdown?: {
    /** GitHub Flavored Markdown — tables, strikethrough, task lists, autolinks. Default `true`. */
    gfm?: boolean;
    /** A single `\n` inside a paragraph becomes `<br>` (GitHub-comment style) instead of a plain space (CommonMark default). Default `false`. */
    breaks?: boolean;
  };
}

/**
 * Convert a Markdown string to a {@link TextFrame} (same result shape as
 * {@link htmlToTextFrame} — it *is* `htmlToTextFrame` under the hood, run on
 * the HTML `marked` produces).
 *
 * @param markdown  a CommonMark/GFM string. Raw HTML inside it converts too
 *                   (see module doc) — no separate handling needed.
 */
export function markdownToTextFrame(
  markdown: string,
  options: MarkdownConvertOptions = {},
): HtmlConvertResult {
  const html = marked.parse(markdown, {
    gfm: options.markdown?.gfm ?? true,
    breaks: options.markdown?.breaks ?? false,
    async: false,
  });
  return htmlToTextFrame(html, options);
}
