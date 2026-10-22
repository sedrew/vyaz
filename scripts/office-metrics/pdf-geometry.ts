/**
 * pdf-geometry.ts — just enough of a PDF content-stream interpreter to read a
 * PowerPoint "Save as PDF" back as geometry: where each text-show operation
 * starts (origin, effective font size, font resource) and the bounding box of
 * each filled path (PowerPoint draws underlines as filled polygons).
 *
 * Coordinates are returned in slide space: points, y down from the page top.
 * Handles what PowerPoint for Mac emits (q/Q/cm, BT/ET, Tm/Td/TD/T*, Tf,
 * Tj, TJ, ' and ", m l c re h, the fill operators, n). Not a general PDF reader.
 */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

export interface PdfText { x: number; y: number; size: number; font: string; bytes: number }
export interface PdfFill { x0: number; y0: number; x1: number; y1: number }
export interface PdfPage { width: number; height: number; texts: PdfText[]; fills: PdfFill[] }

type M = [number, number, number, number, number, number];
const mul = (a: M, b: M): M => [
  a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5],
];
const apply = (m: M, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function tokenize(s: string): (string | number | { str: number } | { name: string })[] {
  const out: (string | number | { str: number } | { name: string })[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '%') { while (i < s.length && s[i] !== '\n' && s[i] !== '\r') i++; continue; }
    if (c === '(') {
      let depth = 1, n = 0; i++;
      while (i < s.length && depth > 0) {
        if (s[i] === '\\') { i += 2; n++; continue; }
        if (s[i] === '(') depth++;
        else if (s[i] === ')') { depth--; if (depth === 0) break; }
        n++; i++;
      }
      i++;
      out.push({ str: n });
      continue;
    }
    if (c === '<' && s[i + 1] !== '<') {
      const j = s.indexOf('>', i);
      out.push({ str: Math.ceil(s.slice(i + 1, j).replace(/\s/g, '').length / 2) });
      i = j + 1;
      continue;
    }
    if (c === '[' || c === ']') { out.push(c); i++; continue; }
    if (c === '/') {
      let j = i + 1;
      while (j < s.length && !/[\s/\[\]()<>]/.test(s[j])) j++;
      out.push({ name: s.slice(i + 1, j) });
      i = j;
      continue;
    }
    let j = i;
    while (j < s.length && !/[\s/\[\]()<>%]/.test(s[j])) j++;
    if (j === i) { i++; continue; }
    const w = s.slice(i, j);
    out.push(/^[+-]?(\d+\.?\d*|\.\d+)$/.test(w) ? parseFloat(w) : w);
    i = j;
  }
  return out;
}

function interpret(content: string, pageH: number): { texts: PdfText[]; fills: PdfFill[] } {
  const texts: PdfText[] = [];
  const fills: PdfFill[] = [];
  let ctm: M = [1, 0, 0, 1, 0, 0];
  const stack: M[] = [];
  let tm: M = [1, 0, 0, 1, 0, 0], tlm: M = [1, 0, 0, 1, 0, 0];
  let font = '', fsz = 0, leading = 0;
  let path: [number, number][] = [];
  const ops: any[] = [];
  const toSlide = (x: number, y: number): [number, number] => [x, pageH - y];
  for (const t of tokenize(content)) {
    if (typeof t !== 'string' || t === '[' || t === ']') { ops.push(t); continue; }
    const n = (k: number) => ops[ops.length - k] as number;
    const show = (bytes: number) => {
      const m = mul(tm, ctm);
      const [x, y] = toSlide(m[4], m[5]);
      const size = fsz * Math.hypot(m[2], m[3]);
      texts.push({ x, y, size, font, bytes });
    };
    switch (t) {
      case 'q': stack.push(ctm); break;
      case 'Q': ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0]; break;
      case 'cm': ctm = mul([n(6), n(5), n(4), n(3), n(2), n(1)], ctm); break;
      case 'BT': tm = [1, 0, 0, 1, 0, 0]; tlm = tm; break;
      case 'Tm': tm = [n(6), n(5), n(4), n(3), n(2), n(1)]; tlm = tm; break;
      case 'Td': tlm = mul([1, 0, 0, 1, n(2), n(1)], tlm); tm = tlm; break;
      case 'TD': leading = -n(1); tlm = mul([1, 0, 0, 1, n(2), n(1)], tlm); tm = tlm; break;
      case 'TL': leading = n(1); break;
      case 'T*': tlm = mul([1, 0, 0, 1, 0, -leading], tlm); tm = tlm; break;
      case 'Tf': font = (ops[ops.length - 2] as { name: string }).name; fsz = n(1); break;
      case 'Tj': case "'": case '"': {
        if (t !== 'Tj') { tlm = mul([1, 0, 0, 1, 0, -leading], tlm); tm = tlm; }
        const s = ops[ops.length - 1] as { str: number };
        show(s?.str ?? 0);
        break;
      }
      case 'TJ': {
        const start = ops.lastIndexOf('[');
        const bytes = ops.slice(start).reduce((a: number, o: any) => a + (o && typeof o === 'object' && 'str' in o ? o.str : 0), 0);
        show(bytes);
        break;
      }
      case 'm': case 'l': path.push(apply(ctm, n(2), n(1))); break;
      case 'c': path.push(apply(ctm, n(2), n(1))); break;
      case 're': {
        const [x, y, w, h] = [n(4), n(3), n(2), n(1)];
        path.push(apply(ctm, x, y), apply(ctm, x + w, y + h));
        break;
      }
      case 'f': case 'f*': case 'F': case 'B': case 'B*': case 'b': case 'b*': {
        if (path.length) {
          const xs = path.map((p) => p[0]), ys = path.map((p) => pageH - p[1]);
          fills.push({ x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) });
        }
        path = [];
        break;
      }
      case 'n': case 'S': case 's': path = []; break;
    }
    ops.length = 0;
  }
  return { texts, fills };
}

/** Pages in order. Assumes one content stream per page (what PowerPoint writes). */
export function readPdfGeometry(file: string): PdfPage[] {
  const buf = readFileSync(file);
  const s = buf.toString('latin1');
  const objs = new Map<number, { dict: string; stream?: string }>();
  const re = /(\d+) 0 obj\s*([^]*?)endobj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const body = m[2];
    const si = body.indexOf('stream');
    if (si < 0) { objs.set(+m[1], { dict: body }); continue; }
    const dict = body.slice(0, si);
    let start = m.index + m[0].indexOf(body) + si + 'stream'.length;
    if (s[start] === '\r') start++;
    if (s[start] === '\n') start++;
    const len = +(/\/Length (\d+)/.exec(dict)?.[1] ?? 0);
    const raw = buf.subarray(start, start + len);
    let stream: string | undefined;
    try { stream = /FlateDecode/.test(dict) ? inflateSync(raw).toString('latin1') : raw.toString('latin1'); } catch { stream = undefined; }
    objs.set(+m[1], { dict, stream });
  }
  const pages: PdfPage[] = [];
  // page tree order: follow /Kids of the root /Pages
  const pagesRoot = [...objs.values()].find((o) => /\/Type\s*\/Pages/.test(o.dict) && !/\/Parent/.test(o.dict));
  const boxOf = (dict: string, inherited: number[]) =>
    /\/MediaBox\s*\[([^\]]*)\]/.exec(dict)?.[1].trim().split(/\s+/).map(Number) ?? inherited;
  const walk = (dict: string, inherited: number[]) => {
    const own = boxOf(dict, inherited);
    const kids = /\/Kids\s*\[([^\]]*)\]/.exec(dict)?.[1];
    if (!kids) return;
    for (const km of kids.matchAll(/(\d+) 0 R/g)) {
      const o = objs.get(+km[1]);
      if (!o) continue;
      if (/\/Type\s*\/Pages/.test(o.dict)) { walk(o.dict, own); continue; }
      const box = boxOf(o.dict, own);
      const cref = /\/Contents (\d+) 0 R/.exec(o.dict)?.[1];
      const content = cref ? objs.get(+cref)?.stream ?? '' : '';
      const height = box[3] - box[1];
      pages.push({ width: box[2] - box[0], height, ...interpret(content, height) });
    }
  };
  if (pagesRoot) walk(pagesRoot.dict, [0, 0, 720, 540]);
  return pages;
}
