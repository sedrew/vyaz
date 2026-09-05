/**
 * walk.ts — DOM → Paragraph[].
 *
 * One pass over the tree. Inline nodes accumulate `TextRun`s into the current
 * paragraph buffer; a block child flushes the buffer and recurses with a fresh
 * (possibly derived) paragraph/run style.
 */
import type { Paragraph, ParagraphStyle, TextRun, TableFrame, TableRow, TableCell } from '@vyaz/core';
import { layoutTableFrame } from '@vyaz/core';
import { renderTableToSVG } from '@vyaz/renderer';
import type { ResolvedOptions } from './options.js';
import { Collector } from './warnings.js';
import { parseInlineStyle } from './inline-style.js';
import { NODE_ELEMENT, NODE_TEXT } from './dom.js';
import { INLINE_STYLE, isInline, BLOCK_TEXT, TRANSPARENT, LIST, DROPPED } from './tags.js';

type RunStyle = Omit<TextRun, 'type' | 'text' | 'inlineWidget'>;

interface Ctx {
  opts: ResolvedOptions;
  col: Collector;
  out: Paragraph[];
  /** SVG fragments for inline-box widgets (tables so far), keyed by id — shared across the whole document, mutated in place. */
  inlineBoxes: Record<string, string>;
  /** Monotonic id source for inline-box widgets. An object (not a number) so it stays shared when `ctx` is spread for a sub-walk (e.g. a table cell's own content). */
  idSeq: { n: number };
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
let _nestedListWarned = false;

// ── Lists ──────────────────────────────────────────────────────────────

interface ListCtx {
  type: 'bullet' | 'number';
  /** 0-based nesting depth → `ListStyle.level`. */
  level: number;
  /** `<ol start>` — set on every item so a group break still counts right. */
  start?: number;
}

/** One `<li>` → one (or more, if it holds a sub-list) list Paragraph(s). */
function walkListItem(
  li: Element,
  lc: ListCtx,
  para: ParagraphStyle,
  run: RunStyle,
  ctx: Ctx,
): void {
  const listStyle = {
    type: lc.type,
    level: lc.level,
    ...(lc.type === 'number' && lc.start !== undefined ? { startNumber: lc.start } : {}),
  };
  const liPara: ParagraphStyle = { ...para, listStyle, spaceAfter: Math.round(ctx.opts.baseSize * 0.2) };

  let buffer: TextRun[] = [];
  const flush = () => {
    if (hasContent(buffer)) ctx.out.push({ style: { ...liPara }, children: mergeAdjacent(buffer) });
    buffer = [];
  };

  for (const node of Array.from(li.childNodes)) {
    if (node.nodeType === NODE_ELEMENT) {
      const child = node as Element;
      const tag = child.tagName.toLowerCase();
      if (LIST.has(tag)) {
        flush();
        if (!_nestedListWarned) {
          ctx.col.warn('nested-list', tag, 'nested list numbering may restart when a level changes');
          _nestedListWarned = true;
        }
        walkList(child, para, run, ctx, lc.level + 1);
        continue;
      }
    }
    // text / inline / flattened block → into this item's line
    appendInline(node, run, buffer, false, ctx);
  }
  flush();
}

function walkList(
  el: Element,
  para: ParagraphStyle,
  run: RunStyle,
  ctx: Ctx,
  level: number,
): void {
  const type: ListCtx['type'] = el.tagName.toLowerCase() === 'ol' ? 'number' : 'bullet';
  const startAttr = Number(el.getAttribute?.('start'));
  const lc: ListCtx = { type, level, start: Number.isFinite(startAttr) && startAttr ? startAttr : undefined };

  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType !== NODE_ELEMENT) continue;
    const child = node as Element;
    const tag = child.tagName.toLowerCase();
    if (tag === 'li') {
      walkListItem(child, lc, para, run, ctx);
      if (lc.start !== undefined) lc.start += 1;
    } else if (LIST.has(tag)) {
      walkList(child, para, run, ctx, level + 1); // <ul> directly inside <ul>
    } else if (tag in DROPPED) {
      ctx.col.drop(child, DROPPED[tag]);
    }
    // stray non-li content in a list is ignored
  }
}

// ── Tables ───────────────────────────────────────────────────────────────
//
// A <table> is laid out and rendered right here (not left for the caller to
// do, like the rest of the model) because @vyaz/converters already depends on both
// @vyaz/core (layoutTableFrame) and @vyaz/renderer (renderTableToSVG) — the
// result is one pre-rendered SVG dropped into the flow as an inline-box, the
// same "self-contained SVG fragment in a box" pattern as an <img>/<progress>
// widget (see options.ts's `resolveImage`, Phase 4).

/** A cell's own content, as an independent TextFrame (recursion — same walk). */
function buildCellFrame(cellEl: Element, ctx: Ctx, runOverride?: Partial<RunStyle>): import('@vyaz/core').TextFrame {
  const run: RunStyle = { ...baseRunStyle(ctx.opts), ...runOverride };
  const out: Paragraph[] = [];
  processChildren(cellEl, baseParaStyle(), run, false, { ...ctx, out });
  return { wrap: true, paragraphs: trimParagraphs(out) };
}

/** `colspan`/`rowspan` — only returned when a real span (>1) is given. */
function spanAttr(el: Element, name: string): number | undefined {
  const v = Number(el.getAttribute?.(name));
  return Number.isFinite(v) && v > 1 ? Math.trunc(v) : undefined;
}

function buildTableRow(tr: Element, ctx: Ctx): TableRow | undefined {
  const cells: TableCell[] = [];
  let isHeader = true;
  for (const td of Array.from(tr.children)) {
    const tag = td.tagName.toLowerCase();
    if (tag !== 'td' && tag !== 'th') continue;
    if (tag !== 'th') isHeader = false;
    const content = buildCellFrame(td, ctx, tag === 'th' ? { fontWeight: 'bold' } : undefined);
    const colSpan = spanAttr(td, 'colspan');
    const rowSpan = spanAttr(td, 'rowspan');
    cells.push({
      content,
      ...(colSpan ? { colSpan } : {}),
      ...(rowSpan ? { rowSpan } : {}),
      ...(tag === 'th' ? { style: { bgColor: '#f5f5f5' } } : {}),
    });
  }
  return cells.length > 0 ? { cells, isHeader } : undefined;
}

/** `<table>` → `TableFrame`. `<thead>`/`<tbody>`/`<tfoot>` are transparent — only their `<tr>`s matter. */
function buildTableFrame(tableEl: Element, ctx: Ctx): TableFrame | undefined {
  const rows: TableRow[] = [];
  for (const child of Array.from(tableEl.children)) {
    const tag = child.tagName.toLowerCase();
    if (tag === 'tr') {
      const row = buildTableRow(child, ctx);
      if (row) rows.push(row);
    } else if (tag === 'thead' || tag === 'tbody' || tag === 'tfoot') {
      for (const tr of Array.from(child.children)) {
        if (tr.tagName.toLowerCase() !== 'tr') continue;
        const row = buildTableRow(tr, ctx);
        if (row) rows.push(row);
      }
    }
    // <caption> is handled by handleTable() itself; <colgroup>/<col> are
    // presentational-only hints with no equivalent here — silently ignored.
  }
  if (rows.length === 0) return undefined;
  return {
    rows,
    width: ctx.opts.width,
    defaultCellStyle: { paddings: 6, borderWidths: 1, borderColors: '#ddd' },
  };
}

/** `<table>` → laid out, rendered to SVG, and pushed as one inline-box paragraph. */
function handleTable(tableEl: Element, para: ParagraphStyle, run: RunStyle, ctx: Ctx): void {
  const captionEl = Array.from(tableEl.children).find((c) => c.tagName.toLowerCase() === 'caption');
  if (captionEl) {
    const buffer: TextRun[] = [];
    for (const node of Array.from(captionEl.childNodes)) appendInline(node, { ...run, fontWeight: 'bold' }, buffer, false, ctx);
    if (hasContent(buffer)) {
      ctx.out.push({
        style: { ...para, alignment: 'center', spaceAfter: Math.round(ctx.opts.baseSize * 0.3) },
        children: mergeAdjacent(buffer),
      });
    }
  }

  const tableFrame = buildTableFrame(tableEl, ctx);
  if (!tableFrame) {
    ctx.col.warn('table-empty', 'table', 'no rows with cells — dropped');
    return;
  }

  let width: number, height: number, svg: string;
  try {
    // A table is laid out and rendered right here, during conversion — unlike
    // the rest of the document, which stays plain data until the caller's own
    // layoutTextFrame() call. 'substitute' keeps one unregistered cell font
    // from failing the whole document; a real @vyaz/converters consumer should still
    // register every family it cares about before calling htmlToTextFrame.
    const result = layoutTableFrame(tableFrame, { mode: ctx.opts.mode, onMissingFont: 'substitute' });
    svg = renderTableToSVG(result);
    width = result.width;
    height = result.height;
  } catch (e) {
    ctx.col.warn('table-render-failed', 'table', `layout/render failed: ${String((e as Error)?.message ?? e)}`);
    return;
  }

  const id = `table-${ctx.idSeq.n++}`;
  ctx.inlineBoxes[id] = svg;
  ctx.out.push({
    style: { ...para, spaceAfter: Math.round(ctx.opts.baseSize * 0.75) },
    children: [{
      type: 'inline-box',
      text: '￼',
      fontFamily: ctx.opts.baseFamily,
      fontSize: ctx.opts.baseSize,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      inlineWidget: { width, height, id },
    }],
  });
}

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
    if (LIST.has(tag)) {
      flush();
      walkList(child, para, run, ctx, 0);
      continue;
    }
    if (tag === 'li') {
      // a stray <li> outside a list — treat as a level-0 bullet
      flush();
      walkListItem(child, { type: 'bullet', level: 0 }, para, run, ctx);
      continue;
    }
    if (tag === 'table') {
      flush();
      handleTable(child, para, run, ctx);
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
      throw new Error(`@vyaz/converters: no mapping for <${tag}>`);
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

/**
 * Trim leading / trailing spaces on each paragraph — but not in `pre`, where
 * whitespace is significant — and drop paragraphs left with no real content.
 */
function trimParagraphs(out: Paragraph[]): Paragraph[] {
  for (const p of out) {
    if (p.style.whiteSpace === 'pre' || p.style.whiteSpace === 'pre-wrap') continue;
    if (p.children[0]) p.children[0].text = p.children[0].text.replace(/^[ \t]+/, '');
    const last = p.children[p.children.length - 1];
    if (last) last.text = last.text.replace(/[ \t]+$/, '');
  }
  return out.filter((p) => p.children.length > 0 && p.children.some((r) => r.text !== ''));
}

export function walk(
  root: Element,
  opts: ResolvedOptions,
  col: Collector,
  inlineBoxes: Record<string, string>,
): Paragraph[] {
  _dlWarned = false;
  _nestedListWarned = false;
  const out: Paragraph[] = [];
  const ctx: Ctx = { opts, col, out, inlineBoxes, idSeq: { n: 0 } };
  processChildren(root, baseParaStyle(), baseRunStyle(opts), false, ctx);
  return trimParagraphs(out);
}
