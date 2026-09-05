/**
 * helpers.ts — test setup for @vyaz/converters.
 *
 * Bun/Node have no global `DOMParser`, so tests parse HTML with linkedom and
 * hand the converter a `parse` option. Browsers use the native `DOMParser` and
 * need no dependency.
 */
import { parseHTML } from 'linkedom';
import { htmlToTextFrame, markdownToTextFrame, type HtmlConvertOptions, type HtmlConvertResult, type MarkdownConvertOptions } from '../src/index.ts';

const linkedomParse = (h: string): Document =>
  // linkedom's parseHTML is literal — it does NOT auto-wrap a fragment the way
  // a browser's DOMParser does, so wrap it in a real document ourselves.
  parseHTML(`<!doctype html><html><head></head><body>${h}</body></html>`).document as unknown as Document;

export function convert(html: string, opts: HtmlConvertOptions = {}): HtmlConvertResult {
  return htmlToTextFrame(html, { parse: linkedomParse, ...opts });
}

export function convertMd(markdown: string, opts: MarkdownConvertOptions = {}): HtmlConvertResult {
  return markdownToTextFrame(markdown, { parse: linkedomParse, ...opts });
}

/** All run texts of a paragraph joined. */
export function text(p: { children: { text: string }[] }): string {
  return p.children.map((r) => r.text).join('');
}
