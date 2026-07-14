/**
 * tagStyles.ts — Default inline styles for HTML text-level elements.
 *
 * Maps HTML tag names to `Partial<TextRun>` overrides.
 * Unimplemented tags are marked with `// @todo`.
 *
 * @see https://html.spec.whatwg.org/multipage/text-level-semantics.html
 */

import type { TextRun } from '@vyaz/core';

/**
 * Default inline style overrides keyed by lowercase tag name.
 */
export const TAG_STYLES: Record<string, Partial<TextRun>> = {
  // ── Inline text semantics (implemented) ────────────────────────────
  b: { fontWeight: 'bold' },
  strong: { fontWeight: 'bold' },
  i: { fontStyle: 'italic' },
  em: { fontStyle: 'italic' },
  u: { underline: true },
  ins: { underline: true },
  s: { strikethrough: true },
  strike: { strikethrough: true },
  del: { strikethrough: true },
  sub: { script: 'sub' },
  sup: { script: 'super' },
  small: { fontSize: 10 }, // relative to 12px default
  mark: { backgroundColor: '#ffff00' },
  code: { fontFamily: 'monospace' },
  kbd: { fontFamily: 'monospace' },
  samp: { fontFamily: 'monospace' },
  var: { fontStyle: 'italic' },

  // ── Headings (block-level, default sizes from UA stylesheet) ───────
  h1: { fontSize: 32, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: 'bold' },
  h3: { fontSize: 20, fontWeight: 'bold' },
  h4: { fontSize: 16, fontWeight: 'bold' },
  h5: { fontSize: 14, fontWeight: 'bold' },
  h6: { fontSize: 12, fontWeight: 'bold' },

  // ── @todo: not yet implemented ─────────────────────────────────────

  /** @todo `abbr` — dotted underline via text-decoration */
  // abbr: { ... },

  /** @todo `bdi` / `bdo` — bidirectional text direction */
  // bdi: {},
  // bdo: {},

  /** @todo `cite` — italic (UA default) */
  // cite: { fontStyle: 'italic' },

  /** @todo `data` — machine-readable value, no visual effect */
  // data: {},

  /** @todo `dfn` — italic (UA default) */
  // dfn: { fontStyle: 'italic' },

  /** @todo `q` — auto-generates quotation marks */
  // q: {},

  /** @todo `ruby` / `rt` / `rp` — ruby annotations */
  // ruby: {},
  // rt: {},
  // rp: {},

  /** @todo `time` — no visual effect */
  // time: {},

  /** @todo `wbr` — soft hyphen / zero-width break opportunity */
  // wbr: {},
};

/**
 * Tags that act as **block-level** containers and start a new paragraph.
 */
export const BLOCK_TAGS = new Set([
  'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'li', 'blockquote', 'pre',
]);

/**
 * Tags that are **inline** — they modify style but stay in the current paragraph.
 */
export const INLINE_TAGS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'cite', 'code', 'data', 'dfn', 'em',
  'i', 'ins', 'kbd', 'mark', 'q', 's', 'samp', 'small', 'span', 'strike',
  'strong', 'sub', 'sup', 'time', 'u', 'var',
]);

/**
 * Tags that are **void** (no children) but still phrasing content.
 */
export const VOID_INLINE_TAGS = new Set([
  'br', 'wbr', 'img', 'input',
]);