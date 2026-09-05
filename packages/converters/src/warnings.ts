/**
 * warnings.ts — non-fatal notes the converter emits.
 *
 * `warnings` = something was mapped but simplified (a disallowed-scheme
 * `href` dropped, flattened a definition list). `dropped` = an element
 * produced no output at all.
 */

export interface HtmlWarning {
  /** Machine tag, e.g. `'link-href-unsafe'`, `'dl-flattened'`, `'abbr-title-lost'`. */
  code: string;
  /** Lower-case tag name involved. */
  tag: string;
  /** Human-readable detail. */
  message: string;
}

export interface DroppedNode {
  tag: string;
  reason: string;
  /** A short slice of the element's own markup (for the docs "dropped" list). */
  outerHTML: string;
}

export class Collector {
  readonly warnings: HtmlWarning[] = [];
  readonly dropped: DroppedNode[] = [];

  warn(code: string, tag: string, message: string): void {
    this.warnings.push({ code, tag, message });
  }

  drop(el: Element, reason: string): void {
    const html = (el.outerHTML ?? `<${el.tagName.toLowerCase()}>`).replace(/\s+/g, ' ').trim();
    this.dropped.push({
      tag: el.tagName.toLowerCase(),
      reason,
      outerHTML: html.length > 200 ? html.slice(0, 197) + '…' : html,
    });
  }
}
