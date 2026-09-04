/**
 * tags.ts — how each HTML tag is classified.
 *
 * Phase 0–2: inline formatting + block text. Lists (Phase 3), graphics
 * (Phase 4) and the full drop list (Phase 5) are stubbed here and refined later.
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

/** Block tags whose content becomes its own paragraph(s). */
export const BLOCK_TEXT: Set<string> = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'address', 'figcaption', 'dt', 'dd', 'li']);

/** Block tags with no visual effect — recurse into children. */
export const TRANSPARENT: Set<string> = new Set([
  'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav',
  'figure', 'hgroup', 'details', 'summary', 'body', 'html', 'center',
  'ul', 'ol', 'dl', 'menu', // real list styling arrives in Phase 3
]);

/** Tags that produce no output (recorded in `dropped[]`). Phases 4–5 move some out. */
export const DROPPED: Record<string, string> = {
  table: 'no grid layout (see ROADMAP)',
  thead: 'table', tbody: 'table', tfoot: 'table', tr: 'table', th: 'table', td: 'table',
  caption: 'table', colgroup: 'table', col: 'table',
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
