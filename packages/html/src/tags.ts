/**
 * tags.ts — how each HTML tag is classified.
 *
 * Inline formatting, block text and lists are classified here and driven by
 * walk.ts's generic dispatch. `<table>` is a special case — see the DROPPED
 * comment below. Graphics (`<img>`/`<svg>`/`<progress>`/`<meter>`/`<hr>` — a
 * later phase) are still in DROPPED.
 */
import type { TextRun } from '@vyaz/core';

/** Inline tags that only change run style (delta merged onto the current style). */
export const INLINE_STYLE: Record<string, (cur: Partial<TextRun>, mono: string) => Partial<TextRun>> = {
  strong: () => ({ fontWeight: 'bold' }),
  b: () => ({ fontWeight: 'bold' }),
  em: () => ({ fontStyle: 'italic' }),
  i: () => ({ fontStyle: 'italic' }),
  cite: () => ({ fontStyle: 'italic' }),
  dfn: () => ({ fontStyle: 'italic' }),
  var: () => ({ fontStyle: 'italic' }),
  u: () => ({ underline: true }),
  ins: () => ({ underline: true }),
  s: () => ({ strikethrough: true }),
  strike: () => ({ strikethrough: true }),
  del: () => ({ strikethrough: true }),
  sup: () => ({ script: 'super' }),
  sub: () => ({ script: 'sub' }),
  small: (cur) => ({ fontSize: (cur.fontSize ?? 16) * 0.8 }),
  big: (cur) => ({ fontSize: (cur.fontSize ?? 16) * 1.2 }),
  mark: () => ({ backgroundColor: '#fcf8b0' }),
  code: (_cur, mono) => ({ fontFamily: mono }),
  kbd: (_cur, mono) => ({ fontFamily: mono }),
  samp: (_cur, mono) => ({ fontFamily: mono }),
  tt: (_cur, mono) => ({ fontFamily: mono }),
};

/** Inline tags handled with extra logic in walk.ts (still inline). */
export const INLINE_SPECIAL: Set<string> = new Set(['a', 'span', 'q', 'abbr', 'br', 'wbr', 'time', 'data', 'bdi', 'bdo', 'ruby', 'rt', 'rp']);

export function isInline(tag: string): boolean {
  return tag in INLINE_STYLE || INLINE_SPECIAL.has(tag);
}

/** Block tags whose content becomes its own paragraph(s). (`li` is handled by the list path.) */
export const BLOCK_TEXT: Set<string> = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'address', 'figcaption', 'dt', 'dd']);

/** Block tags with no visual effect — recurse into children. */
export const TRANSPARENT: Set<string> = new Set([
  'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav',
  'figure', 'hgroup', 'details', 'summary', 'body', 'html', 'center',
  'dl', // dt / dd are BLOCK_TEXT and carry the styling
]);

/** List containers — each child `<li>` becomes a Paragraph with `listStyle`. */
export const LIST: Set<string> = new Set(['ul', 'ol', 'menu']);

/**
 * Tags that produce no output (recorded in `dropped[]`). `<table>` itself is
 * handled by `handleTable()` in walk.ts (→ TableFrame → an inline-box SVG);
 * these entries only fire for a sub-tag found *outside* a `<table>` (malformed
 * markup) — `handleTable` walks a table's own children directly and never
 * consults this map for them.
 */
export const DROPPED: Record<string, string> = {
  thead: 'only valid inside <table>', tbody: 'only valid inside <table>', tfoot: 'only valid inside <table>',
  tr: 'only valid inside <table>', th: 'only valid inside <table>', td: 'only valid inside <table>',
  caption: 'only valid inside <table>', colgroup: 'only valid inside <table>', col: 'only valid inside <table>',
  video: 'media', audio: 'media', iframe: 'embedded document', embed: 'embedded document',
  object: 'embedded document', canvas: 'script-drawn',
  img: 'image (Phase 4: options.resolveImage)', svg: 'inline svg (Phase 4)',
  progress: 'Phase 4', meter: 'Phase 4', hr: 'Phase 4',
  input: 'form control', textarea: 'form control', select: 'form control',
  button: 'form control', form: 'form', fieldset: 'form', legend: 'form', label: 'form',
  script: 'non-content', style: 'CSS not applied', link: 'non-content', meta: 'non-content',
  noscript: 'non-content', template: 'non-content', map: 'non-content', area: 'non-content',
  track: 'non-content', source: 'non-content', param: 'non-content',
};
