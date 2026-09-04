/**
 * walk.ts — DOM → Paragraph[].
 *
 * One pass over the tree. Inline nodes accumulate `TextRun`s into the current
 * paragraph buffer; a block child flushes the buffer and recurses with a fresh
 * (possibly derived) paragraph/run style.
 */
import type { Paragraph, ParagraphStyle, TextRun } from '@vyaz/core';
import type { ResolvedOptions } from './options.js';
import { Collector } from './warnings.js';
import { parseInlineStyle } from './inline-style.js';
import { NODE_ELEMENT, NODE_TEXT } from './dom.js';
import { INLINE_STYLE, isInline, BLOCK_TEXT, TRANSPARENT, DROPPED } from './tags.js';

type RunStyle = Omit<TextRun, 'type' | 'text' | 'inlineWidget'>;

interface Ctx {
  opts: ResolvedOptions;
  col: Collector;
  out: Paragraph[];
}

const WS_RE = /\s+/g;

function baseParaStyle(): ParagraphStyle {
  return { alignment: 'left', lineHeight: 1.4, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal' };
}

function baseRunStyle(o: ResolvedOptions): RunStyle {
  return {
    fontFamily: o.baseFamily,
    fontSize: o.baseSize,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#000000',
  };
}

/** Merge an inline-tag style delta + its `style=""` + `resolveStyle` onto `cur`. */
function inlineStyleFor(el: Element, tag: string, cur: RunStyle, o: ResolvedOptions): RunStyle {
  let next: RunStyle = { ...cur };
  const delta = INLINE_STYLE[tag];
  if (delta) next = { ...next, ...delta(next, o.monospaceFamily) } as RunStyle;
  if (tag === 'a') {
    next.color = o.linkColor;
    next.underline = true;
  }
  const styleAttr = el.getAttribute?.('style');
  if (styleAttr) {
    const parsed = parseInlineStyle(styleAttr, next.fontSize);
    next = { ...next, ...parsed.run } as RunStyle;
  }
  if (o.resolveStyle) {
    const extra = o.resolveStyle(el);
    if (extra) next = { ...next, ...extra } as RunStyle;
  }
  return next;
}

function mkRun(text: string, s: RunStyle): TextRun {
  return { type: 'text', text, ...s };
}

/** Collapse runs of whitespace to a single space (skipped inside <pre>). */
function collapse(text: string): string {
  return text.replace(WS_RE, ' ');
}

/** Append a text/inline node's runs into `buffer`. */
function appendInline(
  node: Node,
  style: RunStyle,
  buffer: TextRun[],
  pre: boolean,
  ctx: Ctx,
): void {
  if (node.nodeType === NODE_TEXT) {
    const raw = node.nodeValue ?? '';
    const text = pre ? raw : collapse(raw);
    if (text) buffer.push(mkRun(text, style));
    return;
  }
  if (node.nodeType !== NODE_ELEMENT) return;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (tag === 'br') {
    if (ctx.opts.hardBreak === 'paragraph') {
      ctx.col.warn('br-as-newline', 'br', "hardBreak:'paragraph' not yet implemented; kept as newline");
    }
    buffer.push(mkRun('\n', style));
    return;
  }
  if (tag === 'wbr') return;

  if (tag in DROPPED) {
    ctx.col.drop(el, DROPPED[tag]);
    return;
  }

  if (!isInline(tag)) {
    // A block element nested directly in inline flow — flatten its text, warn.
    ctx.col.warn('block-in-inline', tag, `<${tag}> inside inline flow was flattened`);
    for (const child of Array.from(el.childNodes)) appendInline(child, style, buffer, pre, ctx);
    return;
  }

  const next = inlineStyleFor(el, tag, style, ctx.opts);

  if (tag === 'a' && el.getAttribute?.('href')) {
    ctx.col.warn('link-href-lost', 'a', `href="${el.getAttribute('href')}" is not carried by the model`);
  }
  if (tag === 'abbr' && el.getAttribute?.('title')) {
    ctx.col.warn('abbr-title-lost', 'abbr', `title="${el.getAttribute('title')}" dropped`);
  }

  if (tag === 'q') buffer.push(mkRun('“', next));
  for (const child of Array.from(el.childNodes)) appendInline(child, next, buffer, pre, ctx);
  if (tag === 'q') buffer.push(mkRun('”', next));
}

/** True when the buffer has any non-whitespace text. */
function hasContent(buffer: TextRun[]): boolean {
  return buffer.some((r) => r.text.trim() !== '' || r.text.includes('\n'));
}

function derive(
  tag: string,
  para: ParagraphStyle,
  run: RunStyle,
  el: Element,
  o: ResolvedOptions,
): { para: ParagraphStyle; run: RunStyle; pre: boolean } {
  let p: ParagraphStyle = { ...para };
  let r: RunStyle = { ...run };
  let pre = false;

  if (/^h[1-6]$/.test(tag)) {
    const mult = o.headingScale[tag as 'h1'];
    r.fontSize = o.baseSize * mult;
    r.fontWeight = 'bold';
    p.spaceBefore = Math.round(r.fontSize * 0.6);
    p.spaceAfter = Math.round(r.fontSize * 0.35);
    p.lineHeight = 1.2;
  } else if (tag === 'p') {
    p.spaceAfter = Math.round(o.baseSize * 0.75);
  } else if (tag === 'blockquote') {
    p.leftIndent = (para.leftIndent ?? 0) + Math.round(o.baseSize * 2.5);
    p.rightIndent = (para.rightIndent ?? 0) + Math.round(o.baseSize);
    p.spaceBefore = p.spaceAfter = Math.round(o.baseSize * 0.5);
    r.color = '#555555';
  } else if (tag === 'pre') {
    pre = true;
    p.whiteSpace = 'pre';
    p.spaceBefore = p.spaceAfter = Math.round(o.baseSize * 0.5);
    r.fontFamily = o.monospaceFamily;
  } else if (tag === 'address') {
    r.fontStyle = 'italic';
    p.spaceAfter = Math.round(o.baseSize * 0.5);
  } else if (tag === 'figcaption') {
    r.fontSize = o.baseSize * 0.85;
    r.color = '#555555';
    p.alignment = 'center';
  } else if (tag === 'dt') {
    r.fontWeight = 'bold';
  } else if (tag === 'dd') {
    p.leftIndent = (para.leftIndent ?? 0) + Math.round(o.baseSize * 2);
    p.spaceAfter = Math.round(o.baseSize * 0.4);
  } else if (tag === 'li') {
    p.leftIndent = (para.leftIndent ?? 0) + Math.round(o.baseSize * 1.5);
    // Real bullet/number markers land in Phase 3.
  }

  // Block-level style="" — only text-align / colour-ish bits we can use.
  const styleAttr = el.getAttribute?.('style');
  if (styleAttr) {
    const parsed = parseInlineStyle(styleAttr, r.fontSize);
    if (parsed.align) p.alignment = parsed.align;
    r = { ...r, ...parsed.run } as RunStyle;
  }
  return { para: p, run: r, pre };
}

// dt/dd flattening is lossy — warn once per document.
let _dlWarned = false;

/** Walk `el`'s children, emitting paragraphs into `ctx.out`. */
function processChildren(
  el: Element,
  para: ParagraphStyle,
  run: RunStyle,
  pre: boolean,
  ctx: Ctx,
): void {
  let buffer: TextRun[] = [];
  const flush = () => {
    if (hasContent(buffer)) {
      ctx.out.push({ style: { ...para }, children: mergeAdjacent(buffer) });
    }
    buffer = [];
  };

  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === NODE_TEXT) {
      appendInline(node, run, buffer, pre, ctx);
      continue;
    }
    if (node.nodeType !== NODE_ELEMENT) continue;

    const child = node as Element;
    const tag = child.tagName.toLowerCase();

    if (tag in DROPPED) {
      ctx.col.drop(child, DROPPED[tag]);
      continue;
    }
    if (isInline(tag)) {
      appendInline(child, run, buffer, pre, ctx);
      continue;
    }
    if (BLOCK_TEXT.has(tag)) {
      flush();
      if (tag === 'dt' || tag === 'dd') {
        if (!_dlWarned) ctx.col.warn('dl-flattened', tag, 'definition list flattened to bold term + indented body');
        _dlWarned = true;
      }
      const d = derive(tag, para, run, child, ctx.opts);
      processChildren(child, d.para, d.run, d.pre, ctx);
      continue;
    }
    if (TRANSPARENT.has(tag)) {
      flush();
      if (tag === 'details' || tag === 'summary') {
        ctx.col.warn('details-flattened', tag, 'details/summary rendered flat (no toggle)');
      }
      processChildren(child, para, run, pre, ctx);
      continue;
    }

    // Unknown tag.
    if (ctx.opts.onUnsupported === 'throw') {
      throw new Error(`@vyaz/html: no mapping for <${tag}>`);
    }
    if (ctx.opts.onUnsupported === 'drop') {
      ctx.col.drop(child, 'no mapping');
      continue;
    }
    // 'placeholder' → treat as transparent
    flush();
    processChildren(child, para, run, pre, ctx);
  }

  flush();
}

/** Coalesce consecutive runs that carry an identical style. */
function mergeAdjacent(runs: TextRun[]): TextRun[] {
  const out: TextRun[] = [];
  for (const r of runs) {
    const last = out[out.length - 1];
    if (last && sameStyle(last, r)) last.text += r.text;
    else out.push({ ...r });
  }
  return out;
}
function sameStyle(a: TextRun, b: TextRun): boolean {
  return a.fontFamily === b.fontFamily && a.fontSize === b.fontSize &&
    a.fontWeight === b.fontWeight && a.fontStyle === b.fontStyle && a.color === b.color &&
    a.backgroundColor === b.backgroundColor && a.underline === b.underline &&
    a.strikethrough === b.strikethrough && a.script === b.script &&
    a.letterSpacing === b.letterSpacing && a.textTransform === b.textTransform;
}

export function walk(root: Element, opts: ResolvedOptions, col: Collector): Paragraph[] {
  _dlWarned = false;
  const out: Paragraph[] = [];
  processChildren(root, baseParaStyle(), baseRunStyle(opts), false, { opts, col, out });
  // Trim leading / trailing spaces on each paragraph — but not in `pre`, where
  // whitespace is significant.
  for (const p of out) {
    if (p.style.whiteSpace === 'pre' || p.style.whiteSpace === 'pre-wrap') continue;
    if (p.children[0]) p.children[0].text = p.children[0].text.replace(/^[ \t]+/, '');
    const last = p.children[p.children.length - 1];
    if (last) last.text = last.text.replace(/[ \t]+$/, '');
  }
  return out.filter((p) => p.children.length > 0 && p.children.some((r) => r.text !== ''));
}
