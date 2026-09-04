/**
 * dom.ts — resolve the input into a root `Element` to walk.
 *
 * Accepts a `Document`, an `Element`, or an HTML string. A string needs a DOM
 * implementation: the global `DOMParser` if present (browsers, Bun, Deno,
 * jsdom), otherwise `opts.parse`.
 */
import type { ResolvedOptions } from './options.js';

/** Minimal shape check without relying on `instanceof` across realms. */
function isElement(v: unknown): v is Element {
  return !!v && typeof v === 'object' && (v as any).nodeType === 1;
}
function isDocument(v: unknown): v is Document {
  return !!v && typeof v === 'object' && (v as any).nodeType === 9;
}

export function resolveRoot(
  input: string | Document | Element,
  opts: ResolvedOptions,
): Element {
  if (isElement(input)) return input;
  if (isDocument(input)) return pickRoot(input);

  let doc: Document;
  if (opts.parse) {
    doc = opts.parse(input);
  } else if (typeof DOMParser !== 'undefined') {
    doc = new DOMParser().parseFromString(input, 'text/html');
  } else {
    throw new Error(
      '@vyaz/html: no DOM available to parse an HTML string. Pass a Document/Element, ' +
        'or provide options.parse (e.g. parse5 + a DOM shim).',
    );
  }
  return pickRoot(doc);
}

/**
 * Prefer `<body>`, but fall back to `documentElement` — some non-browser parsers
 * (linkedom) don't move a fragment into `<body>`, leaving `body` empty.
 */
function pickRoot(doc: Document): Element {
  const body = doc.body;
  if (body && body.childNodes.length > 0) return body;
  return doc.documentElement ?? body!;
}

// Node types we care about (numeric, realm-independent).
export const NODE_ELEMENT = 1;
export const NODE_TEXT = 3;
