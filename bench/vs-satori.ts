/**
 * vs-satori.ts — vyaz vs. Vercel's Satori (https://github.com/vercel/satori)
 * on the same job: an HTML string of styled paragraph text → an SVG string.
 *
 *   bun run bench/vs-satori.ts
 *   BENCH_MAX=5000 bun run bench/vs-satori.ts     # cap the largest size
 *   BENCH_SIZES=50,500,2000 bun run bench/vs-satori.ts
 *
 * Both engines are given the *same* HTML fragment (see `buildHtml()`) and the
 * *same* font family (PT Sans, static Regular/Bold/Italic/BoldItalic — no
 * variable-font axes, since Satori's opentype.js fork can't parse `fvar`).
 * Measured per word count N:
 *
 *   vyaz    convert  — htmlToTextFrame()  (HTML string → TextFrame)
 *           layout   — layoutTextFrame()  (TextFrame → positioned lines)
 *           render   — renderToSVG()      (lines → SVG string, `flat` preset)
 *           total    — the three combined, min of N iterations
 *   satori  total    — satori()           (vnode → SVG string), min of N iterations
 *
 * `min` of N iterations is reported (capacity, not average), same convention
 * as `throughput.ts`.
 *
 * ── Why this isn't an apples-to-apples *rendering* comparison ──────────────
 * The two engines solve different problems and their SVG output is not the
 * same *kind* of artifact:
 *
 *   - vyaz emits `<text>`/`<tspan>` elements that reference the font by name.
 *     Small output; the font must be available wherever the SVG is painted
 *     (browser, or embedded via `@font-face`/`<style>`).
 *   - Satori converts every glyph to an outlined `<path>` (via opentype.js) —
 *     the SVG is font-independent and self-contained, but the payload is
 *     dramatically larger and grows with glyph complexity, not just glyph
 *     count. It also has no notion of intrinsic content height: `height` is
 *     a required, fixed input (flexbox canvas), not a layout output, so this
 *     bench picks one generous height up front — that's inherent to Satori's
 *     OG-image use case, not a bug here.
 *
 * Satori also requires an explicit `display: flex` (or `contents`/`none`) on
 * any element with more than one child node — it has no inline text-flow
 * mode. `buildHtml()` adds `display:flex;flex-wrap:wrap` to each paragraph
 * so mixed plain/`<b>`/`<i>` runs wrap like text; vyaz ignores those two
 * declarations (unrecognized inline-style properties are silently dropped —
 * see `packages/converters/src/inline-style.ts`).
 *
 * So: read this as *layout+serialize throughput* for a comparable HTML→SVG
 * text job, not as "vyaz is an N× faster Satori" — they emit different
 * things. The output-size column is reported for exactly this reason.
 *
 * Satori's own API doesn't take an HTML string at all — it takes a React-like
 * element tree (`{ type, props }`); the community `satori-html` shim parses
 * HTML into that shape via `ultrahtml`, which as of writing throws on *any*
 * input under Bun (`selector.js` assumes a non-empty selector list) — Node
 * only. Rather than fork the bench per-runtime, both engines here get their
 * *native* input, built from one shared word/style generator so the content
 * is provably identical: `buildHtml()` (a string) for vyaz, `buildSatoriNode()`
 * (a vnode tree) for Satori.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseHTML } from 'linkedom';
import satori from 'satori';

import { fontMetricsProvider } from '../packages/core/src/measure/FontMetricsProvider.js';
import { layoutTextFrame } from '../packages/core/src/layout/TextFrameLayoutEngine.js';
import { renderToSVG } from '../packages/renderers/src/SVGRenderer.js';
import { htmlToTextFrame } from '../packages/converters/src/index.js';

// ── shared font: static PT Sans (OFL), 4 weight/style combos ──────────────
const FIXTURES = resolve(import.meta.dir, 'fixtures');
const FONT_FAMILY = 'PT Sans';
const fontFile = (name: string) => readFileSync(resolve(FIXTURES, name));

const REGULAR = fontFile('PT_Sans-Web-Regular.ttf');
const BOLD = fontFile('PT_Sans-Web-Bold.ttf');
const ITALIC = fontFile('PT_Sans-Web-Italic.ttf');
const BOLD_ITALIC = fontFile('PT_Sans-Web-BoldItalic.ttf');

await fontMetricsProvider.registerFont(FONT_FAMILY, { weight: 'normal', style: 'normal' }, REGULAR);
await fontMetricsProvider.registerFont(FONT_FAMILY, { weight: 'bold', style: 'normal' }, BOLD);
await fontMetricsProvider.registerFont(FONT_FAMILY, { weight: 'normal', style: 'italic' }, ITALIC);
await fontMetricsProvider.registerFont(FONT_FAMILY, { weight: 'bold', style: 'italic' }, BOLD_ITALIC);

const satoriFonts = [
  { name: FONT_FAMILY, data: REGULAR, weight: 400 as const, style: 'normal' as const },
  { name: FONT_FAMILY, data: BOLD, weight: 700 as const, style: 'normal' as const },
  { name: FONT_FAMILY, data: ITALIC, weight: 400 as const, style: 'italic' as const },
  { name: FONT_FAMILY, data: BOLD_ITALIC, weight: 700 as const, style: 'italic' as const },
];

// ── shared HTML fixture ────────────────────────────────────────────────────
const WIDTH = 800;
const FONT_SIZE = 16;
const WORDS_PER_PARA = 40;
const WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore'.split(' ');

// A paragraph's content as a flat token list, shared by both renderers below
// so the two engines see provably identical words in provably identical
// order/styling. Consecutive plain words are batched into one text run;
// every 6th word is bold, every 9th italic (single-word runs) — mixed inline
// formatting like a CMS/editor body, not one giant text node.
type Token = { style: 'plain' | 'b' | 'i'; text: string };

function paragraphTokens(words: string[], startIdx: number): Token[] {
  const tokens: Token[] = [];
  let buf: string[] = [];
  const flush = () => { if (buf.length) { tokens.push({ style: 'plain', text: buf.join(' ') }); buf = []; } };
  words.forEach((w, i) => {
    const g = startIdx + i;
    if (g % 6 === 0) { flush(); tokens.push({ style: 'b', text: w }); }
    else if (g % 9 === 0) { flush(); tokens.push({ style: 'i', text: w }); }
    else buf.push(w);
  });
  flush();
  return tokens;
}

function paragraphsFor(totalWords: number): Token[][] {
  const paras: Token[][] = [];
  let made = 0;
  while (made < totalWords) {
    const count = Math.min(WORDS_PER_PARA, totalWords - made);
    const words = Array.from({ length: count }, (_, i) => WORDS[(made + i) % WORDS.length]);
    paras.push(paragraphTokens(words, made));
    made += count;
  }
  return paras;
}

/** vyaz's native input: an HTML string. */
function buildHtml(paragraphs: Token[][]): string {
  const tokenHtml = (t: Token) => (t.style === 'plain' ? `${t.text} ` : `<${t.style}>${t.text}</${t.style}> `);
  const paras = paragraphs.map(
    (tokens) => `<p style="display:flex;flex-wrap:wrap;margin:0 0 12px 0;">${tokens.map(tokenHtml).join('')}</p>`,
  );
  return `<div style="display:flex;flex-direction:column;width:${WIDTH}px;font-family:'${FONT_FAMILY}';font-size:${FONT_SIZE}px;color:#111;">${paras.join('')}</div>`;
}

/** Satori's native input: a React-like vnode tree (no HTML parsing involved). */
function buildSatoriNode(paragraphs: Token[][]) {
  const tokenNode = (t: Token) =>
    t.style === 'plain' ? `${t.text} ` : { type: t.style, props: { children: `${t.text} ` } };
  const paraNodes = paragraphs.map((tokens) => ({
    type: 'p',
    props: {
      style: { display: 'flex', flexWrap: 'wrap', margin: '0 0 12px 0' },
      children: tokens.map(tokenNode),
    },
  }));
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: WIDTH,
        fontFamily: FONT_FAMILY,
        fontSize: FONT_SIZE,
        color: '#111',
      },
      children: paraNodes,
    },
  };
}

// Satori has no intrinsic-height output — `height` is a required input, not
// a result. One generous fixed bound, shared across sizes; it doesn't slow
// Satori down (yoga doesn't fill unused container space with work).
const SATORI_HEIGHT = 400_000;

// ── vyaz pipeline (mirrors the README's htmlToTextFrame → layout → render) ─
function vyazPipeline(htmlStr: string): string {
  const { frame, inlineBoxes } = htmlToTextFrame(htmlStr, {
    width: WIDTH,
    baseFont: { family: FONT_FAMILY, size: FONT_SIZE },
    parse: (h) => parseHTML(`<!doctype html><html><body>${h}</body></html>`).document as unknown as Document,
  });
  const result = layoutTextFrame(frame);
  return renderToSVG(result.lines, {
    preset: 'flat',
    sizing: 'content',
    contentPadding: 0,
    inlineBoxes,
  } as any);
}

async function satoriPipeline(vnode: unknown): Promise<string> {
  return satori(vnode as any, { width: WIDTH, height: SATORI_HEIGHT, fonts: satoriFonts });
}

// ── timing helpers (same convention as throughput.ts) ──────────────────────
const gc = () => { try { (globalThis as any).Bun?.gc?.(true); } catch {} };

async function benchAsync(iters: number, fn: () => Promise<unknown>): Promise<{ min: number; median: number }> {
  await fn(); // warm
  const t: number[] = [];
  for (let i = 0; i < iters; i++) {
    gc();
    const a = performance.now();
    await fn();
    t.push(performance.now() - a);
  }
  t.sort((x, y) => x - y);
  return { min: t[0], median: t[(t.length / 2) | 0] };
}

function itersFor(n: number): number {
  if (n <= 100) return 10;
  if (n <= 1_000) return 6;
  if (n <= 5_000) return 4;
  return 2;
}

// ── run ─────────────────────────────────────────────────────────────────
const DEFAULT_SIZES = [50, 500, 2_000, 10_000];
const cap = process.env.BENCH_MAX ? Number(process.env.BENCH_MAX) : Infinity;
const sizes = (process.env.BENCH_SIZES
  ? process.env.BENCH_SIZES.split(',').map(Number)
  : DEFAULT_SIZES
).filter((n) => n <= cap);

const fmt = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(1)}ms`);
const fmtBytes = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)} MB` : `${(n / 1e3).toFixed(1)} KB`);

console.log(`\nvyaz vs. satori — HTML → SVG text throughput   (PT Sans, ${WORDS_PER_PARA} words/paragraph, width ${WIDTH})\n`);

const rows: string[][] = [];

for (const n of sizes) {
  const paragraphs = paragraphsFor(n);
  const htmlStr = buildHtml(paragraphs);
  const satoriNode = buildSatoriNode(paragraphs);
  const iters = itersFor(n);

  let vyazSvgLen = 0;
  const vyazTiming = await benchAsync(iters, async () => {
    vyazSvgLen = vyazPipeline(htmlStr).length;
  });

  let satoriSvgLen = 0;
  const satoriTiming = await benchAsync(iters, async () => {
    satoriSvgLen = (await satoriPipeline(satoriNode)).length;
  });

  const speedup = satoriTiming.min / vyazTiming.min;
  const sizeRatio = satoriSvgLen / vyazSvgLen;

  rows.push([
    n.toLocaleString(),
    fmt(vyazTiming.min),
    fmtBytes(vyazSvgLen),
    fmt(satoriTiming.min),
    fmtBytes(satoriSvgLen),
    `${speedup.toFixed(1)}×`,
    `${sizeRatio.toFixed(1)}×`,
  ]);

  console.log(
    `  ${n.toLocaleString().padStart(7)} words  ·  vyaz ${fmt(vyazTiming.min).padStart(8)} / ${fmtBytes(vyazSvgLen).padStart(9)}` +
      `  ·  satori ${fmt(satoriTiming.min).padStart(8)} / ${fmtBytes(satoriSvgLen).padStart(9)}` +
      `  ·  ${speedup.toFixed(1)}× time, ${sizeRatio.toFixed(1)}× output`,
  );
}

const head = ['words', 'vyaz total (min)', 'vyaz svg', 'satori total (min)', 'satori svg', 'time ratio', 'size ratio'];
const widths = head.map((h, c) => Math.max(h.length, ...rows.map((r) => r[c].length)));
const line = (r: string[]) => '  ' + r.map((c, i) => c.padEnd(widths[i])).join('  │  ');
console.log('\n' + line(head));
console.log('  ' + widths.map((w) => '─'.repeat(w)).join('──┼──'));
for (const r of rows) console.log(line(r));
console.log(
  '\n(time ratio = satori / vyaz, size ratio = satori-svg-bytes / vyaz-svg-bytes — both "× larger/slower than vyaz")\n' +
    'Not apples-to-apples output: vyaz emits <text> referencing the font by name; satori outlines every\n' +
    'glyph to a <path> (font-independent, but far larger, and pays per-glyph opentype.js path extraction).\n',
);
